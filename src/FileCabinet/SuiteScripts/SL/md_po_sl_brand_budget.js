/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/task",
  "N/ui/serverWidget",
  "N/redirect",
  "N/https",
  "N/query",
  "N/runtime",
  "N/record",
], /**
 * @param{task} task
 * @param{serverWidget} serverWidget
 * @param{redirect} redirect
 * @param{https} https
 * @param{runtime} runtime
 * @param{record} record
 */ (task, serverWidget, redirect, https, query, runtime, record) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    let gt = getGateway();
    let { request, response } = scriptContext;

    try {
      if (request.method === https.Method.GET) {
        let mode = request.parameters["mode"];
        if (mode === "genAllocation") {
          let id = handleAllocationScriptSubmit();
          let rs = getMRScriptDetails();
          redirectToStatusPage(rs);
          return;
        } else if (mode === "checkAllocationSchedule") {
          let brand = request.parameters["brand"];
          let budgetYear = request.parameters["year"];

          let allocationRecords = gt.getAllocationSchedule(brand, budgetYear);
          let errors = "";
          if (allocationRecords.length == 0) {
            errors = "No Allocation Record Found";
          } else if (allocationRecords.length > 1) {
            errors = "Multiple Allocation Records exist for the brand";
          }

          let data = JSON.stringify({
            status: errors ? "failed" : "success",
            details: {
              errors,
              data: allocationRecords,
            },
          });

          response.write({
            output: data,
          });
          return;
        } else {
          defaultPage();
        }
      } else {
        let recId = null;
        try {
          log.error("post", { p: request.parameters, b: request.body });

          let brand = request.parameters["custpage_sl_bdgt_brand"];
          let year = request.parameters["custpage_sl_bdgt_year"];
          let email = request.parameters["custpage_sl_bdgt_email"];

          let allocationRecord = record.create({
            type: "customrecord_md_po_bdgt_allo_scr_rec",
            isDynamic: true,
          });

          allocationRecord.setValue({
            fieldId: "custrecord_md_po_bdgt_allo_brand",
            value: brand,
          });

          allocationRecord.setValue({
            fieldId: "custrecord_md_po_bdgt_allo_bdgt_year",
            value: year,
          });
          if (email) {
            allocationRecord.setValue({
              fieldId: "custrecord_md_po_bdgt_allo_email",
              value: email,
            });
          }

          allocationRecord.setValue({
            fieldId: "custrecord_md_po_bdgt_allo_mr_status",
            value: "pending",
          });

          recId = allocationRecord.save();

          let mrid = handleAllocationScriptSubmit(recId);
          log.error("mr", { mrid, recId });
          record.submitFields({
            type: "customrecord_md_po_bdgt_allo_scr_rec",
            id: recId,
            values: {
              custrecord_md_po_bdgt_allo_scr_pro_id: mrid,
            },
          });

          log.error("mr1", { mrid, recId });

          /* let newRec = record.load({
        type:'customrecord_md_po_bdgt_allo_scr_rec',
        id:recId
       });

       newRec.setValue({fieldId:'custrecord_md_po_bdgt_allo_scr_pro_id',value:mrid}); */

          /*  redirect.toRecord({
        type: 'customrecord_md_po_bdgt_allo_scr_rec',
        id: recId,
        isEditMode:false
    }); */

          let rs = getMRScriptDetails();
          redirectToStatusPage(rs);
        } catch (e) {
          log.error("request failed", { e, recId });
          if (recId) {
            record.delete({
              type: "customrecord_md_po_bdgt_allo_scr_rec",
              id: recId,
            });
          }
        }

        return;

        //defaultPage();
      }
    } catch (e) {
      throw e;
    }

    function defaultPage() {
      let model = getModel();
      let form = serverWidget.createForm({
        title: "Budget Allocation",
      });

      /* form.addButton({
        label: "Generate Allocation",
        id: "custpage_btn_gen_all",
        functionName: "handleclick",
      }); */
      form.addSubmitButton({
        label: "Generate Allocation",
      });

      let brand = form.addField({
        id: "custpage_sl_bdgt_brand",
        type: serverWidget.FieldType.SELECT,
        source: "classification",
        label: "P/L Brand",
      });

      brand.defaultValue = model.brand;

      brand.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE,
      });
      brand.isMandatory = true;

      let budgetYear = form.addField({
        id: "custpage_sl_bdgt_year",
        type: serverWidget.FieldType.SELECT,
        label: "Budget Year",
      });
      budgetYear.addSelectOption({
        value: "",
        text: "",
      });
      model.budgetYears.forEach((e) => {
        budgetYear.addSelectOption({
          value: e.value,
          text: e.text,
        });
      });

      budgetYear.isMandatory = true;

      let emailField = form.addField({
        id: "custpage_sl_bdgt_email",
        type: serverWidget.FieldType.TEXT,
        label: "Email",
      });

      form.clientScriptModulePath = "../CS/md_po_cs_brand_budget";

      response.writePage({
        pageObject: form,
      });
    }

    function getModel() {
      let gt = getGateway();

      let brand = gt.getBrand();

      let budgetYears = brand ? gt.getAccountingPeriodYears(brand) : [];

      log.error("budgetYears", {
        brand,
        budgetYears,
      });

      return {
        brand,
        budgetYears,
      };
    }

    function getGateway() {
      return new BudgetSlGateway({
        runtime,
        query,
      });
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
          query: `select s.id, ds.primarykey from script s inner join deploymentsScript  ds on  s.id =ds.owner  where s.scriptid ='customscript_md_po_mr_brand_bdgt_allo'`,
        })
        .asMappedResults();
    }
  };

  function handleAllocationScriptSubmit(recId) {
    let sstask = task.create({
      taskType: task.TaskType.MAP_REDUCE,
      scriptId: "customscript_md_po_mr_brand_bdgt_allo",
      deploymentId: "customdeploy_md_po_mr_brand_bdgt_allo",
      params: {
        custscript_md_po_mr_bdgt_allo_req_data: recId,
      },
    });

    return sstask.submit();
  }

  class BudgetSlGateway {
    constructor(op) {
      this.runtime = op.runtime;
      this.query = op.query;
    }

    getBrand() {
      let currentScript = this.runtime.getCurrentScript();
      let brand = currentScript.getParameter({
        name: "custscript_md_po_sl_brand_bdgt",
      });
      return brand;
    }

    getResults(sql, params = []) {
      let rs = this.query.runSuiteQL({
        query: sql,
        params: params,
      });

      return rs.asMappedResults();
    }

    getAccountingPeriodYears(brand) {
      let sql = `SELECT 
                        DISTINCT ap.periodname as text,
                        ap.id as value
                  FROM   accountingperiod ap
                  INNER JOIN budgets b
                      ON b.year = ap.id
                  WHERE  b.class = ?
                  AND ap.isyear = ? `;

      return this.getResults(sql, [brand, true]);
    }

    getAllocationSchedule(brand, year) {
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
      where  b.class = ? and  ap.id = ? and ap.isyear = ?`;

      return this.getResults(sql, [brand, year, true]);
    }
  }

  return { onRequest };
});
