/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
  "N/query",
  "N/record",
  "N/search",
  "N/runtime",
  "../common/gateway/ExpenseAllocationGateway"
], /**
 * @param{query} query
 * @param{record} record
 * @param{runtime} runtime
 */ (query, record, search, runtime, ExpenseAllocationGateway) => {
  const STR_CST = {
    RECORDS: {
      EXPENSE_ALLOCATION: {
        ID: "customrecord_md_po_exp_allo_script",
        FIELDS: {
          SUBSIDIARY: "custrecord_md_po_exp_allo_scr_sub",
          ALLOCATION_PERIOD: "custrecord_md_po_exp_allo_scr_alloper",
          ALLOCATION_SCHEDULE: "custrecord_md_po_exp_allo_scr_allo_sch",
          STATUS: "custrecord_md_po_exp_allo_scr_status",
          ERROR_LOGS: "custrecord_md_po_exp_allo_scr_err_lg",
        },
      },
    },
  };

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
    let gt = getExpenseGatway();
    let requestData = gt.getScriprtParametersById('custscript_md_po_mr_exp_all_rec');
    if (!requestData) {
      throw "invalidData";
    }
    log.debug('requestData',requestData);
    let pendingRequets = gt.getPendingExpenseAllocationRecords(requestData);

    let inputStageData = pendingRequets.map((request) => {
      log.debug('request',request);
      

      
      let allocationSchedule = gt.getAllocationScheduleData(request.allocationschedule,request.brand);
      let weightData = allocationSchedule.weights;
      let sourceAccounts = allocationSchedule.sources.map((source)=>{return source.account});
      if(sourceAccounts === 0){
        throw "No Source Accounts in Allocation Record";
      }
      log.debug('weightData',weightData);
      let expenseData = gt.getGenExpensesByQuery(
        request.subsidiary,
        request.brand,
        request.period,
        sourceAccounts
      );
      let genExpenseData = gt.getGenExpenseData(expenseData, weightData);
      return { request, expenseData, weightData, genExpenseData ,allocationSchedule,sourceAccounts};
    });

    return inputStageData;
  };

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
      
    } catch (e) {
      log.error("map error", e);
      throw e;
    }
  };

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
    try {
      let gt = getExpenseGatway();

      let values = JSON.parse(reduceContext.values[0]);

      log.debug('r values',values);

      let request = values.request;

      let genExpenseData = values.genExpenseData;   
      
      let expenseData = values.expenseData; 

      let tranIds = expenseData.map((e)=>{
        return e.id;
      });

      let uniqueTranIds = [...new Set(tranIds)];

      let lastdate = gt.getLastDateOfAccountingPeriod(request.period);

      let body = {};

      body["subsidiary"] = request.subsidiary;
      body["trandate"] = new Date(lastdate);
      //body["custbody_md_po_exp_allo_gen_fr_tran"] = values.jedata[0].id;
      body['approved'] = false;
      body["custbody_md_po_exp_allo_entry"] = true;//"T";

      let relatedJE = gt.getRelatedJournalEntries(
        body.subsidiary,
        uniqueTranIds
      );
      log.debug('relatedJE',relatedJE);

      relatedJE.forEach((obj) => {
        gt.deleteJournal(obj.id);
      });

      let lines = [];
      genExpenseData.forEach((d) => {
        let line = {};
        line["account"] = d.account;
        line["memo"] = d.description;
        line["class"] = d.class;
        line["location"] = d.location;
        line["department"] = d.department;
        line["entity"] = d.entity;
        line["custcol_md_po_exp_allo_gen_fr_tran"] = d.id;
        if (d.debit) {
          line["debit"] = d.debit;
        } else if (d.credit) {
          line["credit"] = d.credit;
        }
        lines.push(line);
      });

      let je = gt.createJournalEntry(body, lines);
      reduceContext.write({
        key: reduceContext.key,
        value: je.id,
      });
    } catch (e) {
      log.error("reduce error", e);
      throw e;
    }
  };

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
    log.error("Input Error", summaryContext.inputSummary.error);
    summaryContext.mapSummary.errors
      .iterator()
      .each(function (key, error, executionNo) {
        log.error({
          title:
            "Map error for key: " + key + ", execution no.  " + executionNo,
          details: error,
        });
        return true;
      });
    summaryContext.reduceSummary.errors
      .iterator()
      .each(function (key, error, executionNo) {
        log.error({
          title:
            "Reduce error for key: " + key + ", execution no. " + executionNo,
          details: error,
        });
        return true;
      });
    summaryContext.output.iterator().each(function (key, value) {
      log.audit({
        title: " summary.output.iterator",
        details: "key: " + key + " / value: " + value,
      });

      return true;
    });
  };

  function getExpenseGatway() {
    return new ExpenseAllocationGateway({
      runtime,
      search,
      query,
      record
    });
  }

  return { getInputData/* , map */, reduce, summarize };
});
