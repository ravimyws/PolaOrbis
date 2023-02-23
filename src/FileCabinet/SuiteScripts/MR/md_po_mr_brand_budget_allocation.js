/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/query", "N/record", "N/runtime",'N/email'], /**
 * @param{query} query
 * @param{record} record,
 * @param{runtime} runtime
 * @param{email} email
 */ (query, record, runtime,email) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            let brandBudgetArray = [];
            try {
                let budgetGateWay = new BudgetGateWay({
                  runtime: runtime,
                  query: query,
                  record: record,
                });
          
                let brand = budgetGateWay.getBrand();
                //   log.error("brand", brand);
                if (!brand) {
                  throw "No, Brand to get Allocation Record";
                }
          
                let allocationRecords = budgetGateWay.getAllocationRecordsByBrand(brand);
          
                if (allocationRecords.length == 0) {
                  throw "No Allocation Record";
                } else if (allocationRecords.length > 1) {
                  throw "Multiple Allocation Records exist for the brand";
                }
          
                let weightData = budgetGateWay.getAllocationWeightData(
                  allocationRecords[0].id
                );
                //   log.error("weightData", weightData);
                let brandBudgetIds = budgetGateWay.getBudgetIdsByBrand(brand,allocationRecords[0].subsidiary);
                //   log.error("brandBudgetIds", brandBudgetIds);
          
                let budgetData = brandBudgetIds.map((obj) => {
                  return budgetGateWay.getBudgetRecordData(obj.id);
                });
          
                //   log.error("budgetData", budgetData);
          
                let expandBudgetData = weightData.map((weightObj) => {
                  return budgetData.map((budget) => {
                    let cloneBudegt = JSON.parse(JSON.stringify(budget));
          
                    cloneBudegt.b["class"] = weightObj["class"];
                    cloneBudegt.amounts.forEach((amountObject) => {
                      let value = amountObject.value;
                      amountObject.value = value * (weightObj.weight / 100);
                    });
                    return cloneBudegt;
                  });
                });
          
                brandBudgetArray = expandBudgetData.flat(Infinity);
          
                //   log.error("brandBudgetArray", brandBudgetArray);
                //   log.error("brandBudgetArray l", brandBudgetArray.length);
          
                
              } catch (e) {      
                log.error("error while running script", e);
                throw e;
              }

              return brandBudgetArray
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {

              try {
                let budget = JSON.parse(mapContext.value);
                let budgetGateWay = new BudgetGateWay({
                    runtime: runtime,
                    query: query,
                    record: record,
                  });

                let budgetId = budgetGateWay.getBudgetByBodyFields(budget.b);
                if (budgetId) {
                  let update = budgetGateWay.updateBudgetRecord(budget, budgetId);
                  mapContext.write({
                    key: 'update',
                    value:{details:{id:budgetId,key:mapContext.key},type:'update'}
                  });
                  
                } else {
                  let createId = budgetGateWay.createBudgetRecord(budget);
                  mapContext.write({
                    key: 'create',
                    value:{details:{id:createId,key:mapContext.key},type:'create'}
                  });
                }
              } catch (e) {
                
                mapContext.write({
                    key: 'error',
                    value:{details:{error:e,budget:budget.b,key:mapContext.key},type:'error'}
                  });
              }

        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {

            try{

                reduceContext.write({
                    key:reduceContext.key,
                    value: reduceContext.values
                });
           

            }catch(e){
                log.error('reduce error',e);
            }

        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {
            let data = {};
            summaryContext.output.iterator().each(function (key, value){
                let cvalue = JSON.parse(value);
                log.audit({
                    title: ' summary.output.iterator',
                    details: 'key: ' + key +'/ cvalue '+cvalue.length+ ' / value: ' + value
                });

                data[key] = cvalue;
                
                return true;
             });

             if(data.error){
                log.error('error details',data.error);
             }
        }

        class BudgetGateWay {
            runtime;
            query;
            record;
            constructor(op) {
              this.runtime = op.runtime;
              this.query = op.query;
              this.record = op.record;
            }
            getBrand() {
              let currentScript = this.runtime.getCurrentScript();
              let brand = currentScript.getParameter({
                name: "custscript_md_po_mr_bdgt_brand",
              });
              return brand;
            }
        
            getBudgetByBodyFields(bodyFields) {
              let sql = `select id  from budgets b
              where   
              b.subsidiary = ?
              and b.year= ?
              and b.account = ?
              AND nvl(b.category,1) = nvl(${bodyFields.category || null} ,1)
              and nvl(b.currency,1) = nvl(${bodyFields.currency || null} ,1)
              and nvl(b.customer,1) = nvl(${bodyFields.customer || null},1) 
              and nvl(b.item,1) = nvl(${bodyFields.item || null} ,1)
              and nvl(b.class,1) = nvl(${bodyFields['class'] || null},1) 
              and  nvl(b.department,1) = nvl(${bodyFields.department || null},1) 
              and nvl(b.location,1) = nvl(${bodyFields.location || null},1)`;
        
              let params = [];
              params.push(bodyFields.subsidiary);
              params.push(bodyFields.year);
              params.push(bodyFields.account);
              /* params.push(bodyFields.category || null);
              params.push(bodyFields.currency || null);
              params.push(bodyFields.customer || null);
              params.push(bodyFields.item || null);
              params.push(bodyFields.class || null);
              params.push(bodyFields.department || null);
              params.push(bodyFields.location || null); */
              //log.error('getBudgetByBodyFields',{sql,params});
              let rs = this.getResults(sql, params);
        
              return rs.length > 0 ? rs[0]["id"] : null;
            }
        
            getAllocationRecordsByBrand(brand) {
              let sql = `select 
                        distinct als.name, 
                        als.id ,
                        als.subsidiary
                      from 
                        GeneralAllocationSchedule als 
                        INNER JOIN accountingPeriod ap 
                        ON ap.periodname = als.name 
                        INNER JOIN budgets b 
                        ON b.year = ap.id 
                        AND b.subsidiary = als.subsidiary
                        and b.class = ?`;
        
              return this.getResults(sql, [brand]);
            }
        
            getResults(sql, params = []) {
              let rs = this.query.runSuiteQL({
                query: sql,
                params: params,
              });
        
              return rs.asMappedResults();
            }
        
            getAllocationWeightData(allocationRecordId) {
              let allocationRecord = this.record.load({
                type: this.record.Type.ALLOCATION_SCHEDULE,
                id: allocationRecordId,
                isDynamic: true,
              });
        
              let destinationLineCount = allocationRecord.getLineCount(
                "allocationdestination"
              );
              let data = [];
              for (let i = 0; i < destinationLineCount; i++) {
                allocationRecord.selectLine({
                  sublistId: "allocationdestination",
                  line: i,
                });
        
                let destinationData = ["account", "class", "weight"].reduce(
                  (acc, fieldId) => {
                    let value = allocationRecord.getCurrentSublistValue({
                      sublistId: "allocationdestination",
                      fieldId,
                    });
                    acc[fieldId] = value;
                    return acc;
                  },
                  {}
                );
        
                data.push(destinationData);
              }
        
              return data;
            }
        
            getBudgetIdsByBrand(brand,subsidiary) {
              let sql = `select id from budgets where class = ? and subsidiary =?`;
        
              return this.getResults(sql, [brand,subsidiary]);
            }
        
            getBudgetRecordData(budgetId) {
              let budget = this.record.load({
                type: "budgetImport",
                id: budgetId,
                isDynamic: true,
              });
        
              let bodyFields = [
                "subsidiary",
                "year",
                "category",
                "budgettype",
                "currency",
                "customer",
                "item",
                "class",
                "department",
                "location",
                "account",
              ];
              let amountFields = budget.getFields().filter((key) => {
                return key.indexOf("periodamount") > -1;
              });
        
              let obj = bodyFields.reduce((acc, fieldId) => {
                acc[fieldId] = budget.getValue(fieldId);
                return acc;
              }, {});
        
              let amounts = amountFields.reduce((acc, fieldId) => {
                let value = budget.getValue(fieldId);
                if (value) {
                  acc.push({ fieldId, value });
                }
                return acc;
              }, []);
        
              return { b: obj, amounts };
            }
        
            createBudgetRecord(data) {
              let budget = this.record.create({
                type: "budgetImport",
                //id: 901,
                isDynamic: true,
              });
        
              Object.keys(data.b).forEach((fieldId) => {
                let value = data.b[fieldId];
                if (value) {
                  budget.setValue({
                    fieldId,
                    value,
                  });
                }
              });
        
              this.updateAccountLine(data, budget);
        
              return budget.save();
            }
        
            updateBudgetRecord(data, id) {
              let budget = this.record.load({
                type: "budgetImport",
                id: id,
                isDynamic: true,
              });
        
              this.updateAccountLine(data, budget);
        
              return budget.save();
            }
        
            updateAccountLine(data, budget) {
              data.amounts.forEach((amountObj) => {
                let value = amountObj.value;
                if (value) {
                  budget.setValue({
                    fieldId: amountObj.fieldId,
                    value,
                  });
                }
              });
            }
          }

        return {getInputData, map, reduce, summarize}

    });
