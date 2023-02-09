/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(["N/query", "N/record", "N/runtime",'N/email'], /**
 * @param{query} query
 * @param{record} record,
 * @param{runtime} runtime
 * @param{email} email
 */ (query, record, runtime,email) => {
  /**
   * Defines the Scheduled script trigger point.
   * @param {Object} scriptContext
   * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
   * @since 2015.2
   */
  const execute = (scriptContext) => {
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

      let brandBudgetArray = expandBudgetData.flat(Infinity);

      //   log.error("brandBudgetArray", brandBudgetArray);
      //   log.error("brandBudgetArray l", brandBudgetArray.length);

      let createdBudgetRecords = brandBudgetArray.reduce(
        (acc, budget,i) => {
          try {
            let budgetId = budgetGateWay.getBudgetByBodyFields(budget.b);
            if (budgetId) {
              let update = budgetGateWay.updateBudgetRecord(budget, budgetId);
              acc.u.push(budgetId);
              /* acc.u.push(i); */
            } else {
              let createId = budgetGateWay.createBudgetRecord(budget);
              acc.c.push(createId);
              /* acc.c.push(i); */
            }
          } catch (e) {
            acc.e.push({e,b:budget.b});
          }
          return acc;
        },
        { c: [], u: [], e: [] }
      );

      log.error("createdBudgetRecords ", createdBudgetRecords);
    } catch (e) {      
      log.error("error while running script", e);
      throw e;
    }
  };

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
        name: "custscript_md_po_ss_bdgt_brand",
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

  return { execute };
});
