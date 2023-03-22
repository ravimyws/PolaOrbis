/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/query",
  "N/record",
  "N/search",
  "N/ui/serverWidget",
  "N/url",
  "N/https",
  "N/runtime",
  "N/redirect",
  "N/task",
  "../common/gateway/ExpenseAllocationGateway"
], /**
 * @param{query} query
 * @param{record} record
 * @param{search} search
 * @param{serverWidget} serverWidget
 * @param{url} url
 * @param{https} https
 * @param{runtime} runtime
 */ (query, record, search, serverWidget, url, https, runtime,redirect,task,ExpenseAllocationGateway) => {
  const STR_CST = {
    UI: {
      FIELDS: {
        SUBSIDIARY: "custpage_sl_expallo_subsidiary",
        PERIOD: "custpage_sl_expallo_period",
        ALLOCATION_SCHEDULE: "custpage_sl_expallo_allo_sch",
      },
      SUBLISTS: {
        EXPENSES: {
          ID: "custpage_sl_expallo_esp_list",
        },
        GENERATED_EXPENSE: {
          ID: "custpage_sl_expallo_gen_exp",
        },
      },
    },
  };
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    let { request, response } = scriptContext;

    try {
      log.debug('onRequest',request.method);
      let gateWay = new ExpenseAllocationGateway({
        runtime,
        search,
        query,
        record,
        task
      });
      let brand = gateWay.getBrand();
      let paramaters = request.parameters;
      if (request.method === https.Method.GET) {
        if (paramaters.mode) {
          if (
            paramaters.mode === "allocationScheduleAction" &&
            paramaters.subsidiary &&
            paramaters.period
          ) {
            let form = getForm();

            let subsidiaryField = form.getField(STR_CST.UI.FIELDS.SUBSIDIARY);
            subsidiaryField.defaultValue = paramaters.subsidiary;
            let periodFields = form.getField(STR_CST.UI.FIELDS.PERIOD);
            periodFields.defaultValue = paramaters.period;
            let allocationFields = form.getField(
              STR_CST.UI.FIELDS.ALLOCATION_SCHEDULE
            );

            let allocationSchedules = gateWay.getAllocationScheduleBySubsidiary(
              paramaters.subsidiary
            );

            allocationFields.addSelectOption({
              value: "",
              text: "",
            });

            allocationSchedules.forEach((e) => {
              allocationFields.addSelectOption({
                value: e.value,
                text: e.text,
              });
            });

            response.writePage({
              pageObject: form,
            });
          } else if (
            paramaters.mode === "searchAction" &&
            paramaters.subsidiary &&
            paramaters.period &&
            paramaters.allocationSchedule
          ) {
            let form = getForm();

            let subsidiaryField = form.getField(STR_CST.UI.FIELDS.SUBSIDIARY);
            subsidiaryField.defaultValue = paramaters.subsidiary;
            let periodFields = form.getField(STR_CST.UI.FIELDS.PERIOD);
            periodFields.defaultValue = paramaters.period;
            let allocationFields = form.getField(
              STR_CST.UI.FIELDS.ALLOCATION_SCHEDULE
            );

            let allocationSchedules = gateWay.getAllocationScheduleBySubsidiary(
              paramaters.subsidiary
            );

            allocationFields.addSelectOption({
              value: "",
              text: "",
            });

            allocationSchedules.forEach((e) => {
              allocationFields.addSelectOption({
                value: e.value,
                text: e.text,
              });
            });

            allocationFields.defaultValue = paramaters.allocationSchedule;

            let expensesSublist = form.addSublist({
              id: STR_CST.UI.SUBLISTS.EXPENSES.ID,
              type: serverWidget.SublistType.LIST,
              label: "Expense",
            });

            let expSublistFields = [
              {
                id: "custpage_sl_expallo_tranacc",
                type: serverWidget.FieldType.SELECT,
                label: "Account",
                source: "account",
                key: "account",
              },
              /* {
                id: "custpage_sl_expallo_descr",
                type: serverWidget.FieldType.TEXT,
                label: "Description",
                //source: "account",
                key: "description",
              }, */
              {
                id: "custpage_sl_expallo_tran_damty",
                type: serverWidget.FieldType.CURRENCY,
                label:'Debit',
                key: "debit",
              },
              {
                id: "custpage_sl_expallo_tran_camt",
                type: serverWidget.FieldType.CURRENCY,
                label:'Credit',
                key: "credit",
              },
              {
                id: "custpage_sl_expallo_tranid",
                type: serverWidget.FieldType.SELECT,
                label: "Transaction",
                source: "transaction",
                key: "id",
              },
              /* {
                id: "custpage_sl_expallo_tranname",
                type: serverWidget.FieldType.INTEGER,
                key: "trandisplayname",
              },
              /* {
                id: "custpage_sl_expallo_trantype",
                type: serverWidget.FieldType.INTEGER,
                key: "type",
              }, 
              {
                id: "custpage_sl_expallo_tranid",
                type: serverWidget.FieldType.INTEGER,
                key: "subsidiary",
              },
              {
                id: "custpage_sl_expallo_tranid",
                type: serverWidget.FieldType.INTEGER,
                key: "postingperiod",
              }, */
              {
                id: "custpage_sl_expallo_tranentity",
                type: serverWidget.FieldType.SELECT,
                label: "Entity",
                source: -9,//"entity",
                key: "entity",
              },
              ,
              {
                id: "custpage_sl_expallo_tranclass",
                type: serverWidget.FieldType.SELECT,
                label: "Class",
                source: "classification",
                key: "class",
              },
              {
                id: "custpage_sl_expallo_trandep",
                type: serverWidget.FieldType.SELECT,
                label: "Department",
                source: "department",
                key: "department",
              },
              {
                id: "custpage_sl_expallo_tranloc",
                type: serverWidget.FieldType.SELECT,
                label: "Location",
                source: "location",
                key: "location",
              },
              /* {
                id: "custpage_sl_expallo_tranid",
                type: serverWidget.FieldType.INTEGER,
                key: "accttype",
              }, 
              {
               id: "custpage_sl_expallo_tranamt",
                type: serverWidget.FieldType.CURRENCY,
                label:'Amount',
                key: "amount",
              },*/
            ];

            expSublistFields.forEach((e) => {
              let field = expensesSublist.addField(e);
              field.updateDisplayType({
                displayType : serverWidget.FieldDisplayType.INLINE
            });
            });

            let allocationSchedule = gateWay.getAllocationScheduleData(paramaters.allocationSchedule,brand);
            log.debug('allocationSchedule',allocationSchedule);
            let weightData = allocationSchedule.weights;
            let sourceAccounts = allocationSchedule.sources.map((source)=>{return source.account});
            log.debug('sourceAccounts',sourceAccounts);
            if(sourceAccounts.length === 0){
              throw "No Source Accounts in Allocation Record";
            }

            let expenseData = gateWay.getGenExpensesByQuery(
              paramaters.subsidiary,
              brand,
              paramaters.period,
              sourceAccounts
            );

            

            log.error('expenseData',{expenseData,weightData});

            expenseData.forEach((row, i) => {
              expSublistFields.forEach((e) => {
                let value = row[e.key];
                if (value) {
                  expensesSublist.setSublistValue({
                    id: e.id,
                    line: i,
                    value: value,
                  });
                }
              });
            });

            let genExpenseData = gateWay.getExpenseAllocatedTranData(paramaters.subsidiary, paramaters.period,sourceAccounts);

            let genExpSublistFields = [
              {
                id: "custpage_sl_expallo_gtranacc",
                type: serverWidget.FieldType.SELECT,
                label: "Account",
                source: "account",
                key: "account",
              } ,
              {
                id: "custpage_sl_expallo_gdescr",
                type: serverWidget.FieldType.TEXT,
                label: "Description",
                key: "memo",
              },
              {
                id: "custpage_sl_expallo_gtran_damty",
                type: serverWidget.FieldType.CURRENCY,
                label:'Debit',
                key: "debit",
              },
              {
                id: "custpage_sl_expallo_gtran_camt",
                type: serverWidget.FieldType.CURRENCY,
                label:'Credit',
                key: "credit",
              },
              
              {
                id: "custpage_sl_expallo_gtranentity",
                type: serverWidget.FieldType.SELECT,
                label: "Entity",
                source: -9,//"entity",
                key: "entity",
              },              
              {
                id: "custpage_sl_expallo_gtranclass",
                type: serverWidget.FieldType.SELECT,
                label: "Class",
                source: "classification",
                key: "class",
              },
              {
                id: "custpage_sl_expallo_gtrandep",
                type: serverWidget.FieldType.SELECT,
                label: "Department",
                source: "department",
                key: "department",
              },
              {
                id: "custpage_sl_expallo_gtranloc",
                type: serverWidget.FieldType.SELECT,
                label: "Location",
                source: "location",
                key: "location",
              },
              {
                id: "custpage_sl_expallo_gtranid",
                type: serverWidget.FieldType.SELECT,
                label: "Generated From",
                source: "transaction",
                key: "custcol_md_po_exp_allo_gen_fr_tran",
              },
              {
                id: "custpage_sl_expallo_gtranaidtext",
                type: serverWidget.FieldType.TEXT,
                label: "Generated From Transaction Id",
                // source: "transaction",
                key: "custcol_md_po_exp_allo_gen_fr_tran",
              },
              {
                id: "custpage_sl_expallo_gtranaid",
                type: serverWidget.FieldType.SELECT,
                label: "Transaction",
                source: "transaction",
                key: "id",
              },
              {
                id: "custpage_sl_expallo_gtranae",
                type: serverWidget.FieldType.CHECKBOX,
                label: "Allocated Entry",
                key: "custbody_md_po_exp_allo_entry",
              }  
            ];

            let genExpensesSublist = form.addSublist({
              id: STR_CST.UI.SUBLISTS.GENERATED_EXPENSE.ID,
              type: serverWidget.SublistType.LIST,
              label: "Generate Expense",
            });

            genExpSublistFields.forEach((e,i) => {
              let field = genExpensesSublist.addField(e);             
              field.updateDisplayType({
                displayType : serverWidget.FieldDisplayType.INLINE
            });
            });

            genExpenseData.forEach((row, i) => {
              genExpSublistFields.forEach((e) => {
                if(i===0){
                  log.error('e.id',e.id);
                }
                let value = row[e.key];
                if (value) {
                  genExpensesSublist.setSublistValue({
                    id: e.id,
                    line: i,
                    value: e.id === 'custpage_sl_expallo_gtranae' ?'T' : value,
                  });
                }
              });
            });

            response.writePage({
              pageObject: form,
            });
          }
        } else {
          let form = getForm();

          response.writePage({
            pageObject: form,
          });
        }
      } else {

        try{
          
          log.debug('post');
          let subsidiary = paramaters[STR_CST.UI.FIELDS.SUBSIDIARY];
          let period = paramaters[STR_CST.UI.FIELDS.PERIOD];
          let allocationSchedule = paramaters[STR_CST.UI.FIELDS.ALLOCATION_SCHEDULE];
          log.debug('pdata',{subsidiary,period,allocationSchedule,brand});
          let expRec = gateWay.createExpenseAllocation(subsidiary,period,allocationSchedule,brand);
          log.debug('expRec',expRec.id);
          let t = gateWay.executeExpenseMRTask(expRec.id)
          log.debug('t',t);
          redirectToMrScript();
        }catch(e){
          redirectToMrScript();
        }

      }
    } catch (e) {
      log.error("Error", e);
    }

    function redirectToMrScript() {
      let rs = getMRScriptDetails();
      redirectToStatusPage(rs);
    }

    function redirectToStatusPage(rs) {
      redirect.redirect({
        url: "/app/common/scripting/mapreducescriptstatus.nl",
        parameters: {
          scripttype: rs[0].id,
          primarykey: rs[0].primarykey,
        },
      });
    }

    function getMRScriptDetails() {
      return query
        .runSuiteQL({
          query: `select s.id, ds.primarykey from script s inner join deploymentsScript  ds on  s.id =ds.owner  where s.scriptid ='customscript_md_po_mr_expense_allocation'`,
        })
        .asMappedResults();
    }

    function getForm() {
      let form = serverWidget.createForm({
        title: "Expense Allocation",
      });

      let subsidiary = form.addField({
        id: STR_CST.UI.FIELDS.SUBSIDIARY,
        type: serverWidget.FieldType.SELECT,
        source: "subsidiary",
        label: "Subsidiary",
      });
      let period = form.addField({
        id: STR_CST.UI.FIELDS.PERIOD,
        type: serverWidget.FieldType.SELECT,
        source: "accountingperiod",
        label: "Allocation Period",
      });

      let allocationSchedule = form.addField({
        id: STR_CST.UI.FIELDS.ALLOCATION_SCHEDULE,
        type: serverWidget.FieldType.SELECT,
        label: "Allocation Schedule",
      });

      /* form.addButton({
        id: "custpage_btn_search",
        label: "Search",
        functionName: "handleSearch",
      }); */

      form.addSubmitButton({
        label: "Generate Expense Allocation",
      });

      form.clientScriptModulePath = "../CS/md_po_cs_expense_allocation";
      return form;
    }
  };



  return { onRequest };
});


