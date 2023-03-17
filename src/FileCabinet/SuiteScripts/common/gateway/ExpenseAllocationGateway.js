/**
 * @NApiVersion 2.1
 */
define([], () => {
  const constants = {
    RECORDS: {
      JOURNAL_ENTRY: {
        FIELDS: {
          SUBSIDIARY: "subsidiary",
        },
        SUBLISTS: {
          LINE: {
            ID: "line",
            FIELDS: {
              ACCOUNT: "account",
              DEBIT: "debit",
              CREDIT: "credit",
              ENTITY: "entity",
              LOCATION: "location",
              CLASS: "class",
              DEPARTMENT: "department",
              PO: "cseg_ts_container",
            },
          },
        },
      },
    },
  };

  class Gateway {
    runtime;
    query;
    search;
    record;
    task;

    constructor(op) {
      this.runtime = op.runtime;
      this.query = op.query;
      this.search = op.search;
      this.record = op.record;
      this.task = op.task;
    }

    getBrand() {
      let currentScript = this.runtime.getCurrentScript();
      let brand = currentScript.getParameter({
        name: "custscript_md_po_sl_expallo_brand",
      });
      return brand;
    }

    getAllocationScheduleData(allocationRecordId,brand) {
      let allocationRecord = this.record.load({
        type: this.record.Type.ALLOCATION_SCHEDULE,
        id: allocationRecordId,
        isDynamic: true,
      });

      let sourceLineCount = allocationRecord.getLineCount('allocationsource');
      let sources =[];

      for(let i = 0; i < sourceLineCount; i++){
        allocationRecord.selectLine({
          sublistId: "allocationsource",
          line: i,
        });
        let sourceAccount = allocationRecord.getCurrentSublistValue({
          sublistId: "allocationsource",
          fieldId:'account',
        });
        let classification = allocationRecord.getCurrentSublistValue({
          sublistId: "allocationsource",
          fieldId:'class',
        });
        
        sources.push({account:sourceAccount,class:classification});
        
      }

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

      return {sources:sources,weights:data};
    }

    getGenExpenses(subsidiary, genClass, period) {
      var transactionSearchObj = search.create({
        type: "transaction",
        filters: [
          ["subsidiary", "anyof", subsidiary],
          "AND",
          ["class", "anyof", genClass],
          "AND",
          ["mainline", "is", "F"],
          "AND",
          ["postingperiod", "abs", period],
          "AND",
          ["account.type", "anyof", "Expense"],
        ],
        columns: [
          search.createColumn({ name: "account", label: "Account" }),
          search.createColumn({ name: "debitamount", label: "Amount (Debit)" }),
          search.createColumn({
            name: "creditamount",
            label: "Amount (Credit)",
          }),
          search.createColumn({ name: "amount", label: "Amount" }),
          search.createColumn({ name: "department", label: "Department" }),
          search.createColumn({ name: "entity", label: "Name" }),
          search.createColumn({ name: "class", label: "P/L Brand" }),
          search.createColumn({ name: "location", label: "Location" }),
          search.createColumn({ name: "internalid", label: "Internal ID" }),
          search.createColumn({ name: "type", label: "Type" }),
        ],
        /* columns:
                    [
                       search.createColumn({
                          name: "account",
                          summary: "GROUP",
                          label: "Account"
                       }),
                       search.createColumn({
                          name: "debitamount",
                          summary: "SUM",
                          label: "Amount (Debit)"
                       }),
                       search.createColumn({
                          name: "creditamount",
                          summary: "SUM",
                          label: "Amount (Credit)"
                       }),
                       search.createColumn({
                          name: "amount",
                          summary: "SUM",
                          label: "Amount"
                       }),
                       search.createColumn({
                          name: "department",
                          summary: "GROUP",
                          label: "Department"
                       }),
                       search.createColumn({
                          name: "entity",
                          summary: "GROUP",
                          label: "Name"
                       }),
                       search.createColumn({
                          name: "class",
                          summary: "GROUP",
                          label: "P/L Brand"
                       }),
                       search.createColumn({
                          name: "location",
                          summary: "GROUP",
                          label: "Location"
                       }),
                       search.createColumn({
                          name: "custcol_potr_accr_exp_rqt_cus",
                          summary: "GROUP",
                          label: "Customer"
                       }),
                       search.createColumn({
                          name: "memo",
                          summary: "GROUP",
                          label: "Memo"
                       })
                    ] */
      });
      var searchResultCount = transactionSearchObj.runPaged().count;
      log.debug("transactionSearchObj result count", searchResultCount);
      transactionSearchObj.run().each(function (result) {
        // .run().each has a limit of 4,000 results
        return true;
      });
    }

    /* @return {id":9016,
            "trandisplayname":"Expense Report #55",
            "type":"ExpRept",
            "subsidiary":1,
            "postingperiod":123,
            "account":385,
            "entity":null,
            "class":5,
            "department":null,
            "location":null,
            "accttype":"Expense",
            "foreignamount":500,
            "creditforeignamount":null,
            "debitforeignamount":500} */
    getGenExpensesByQuery(subsidiary, genClass, period,sourceAccounts) {
      log.error("getGenExpensesByQuery", { subsidiary, genClass, period });
      let sql = `SELECT 
              BUILTIN_RESULT.TYPE_INTEGER("TRANSACTION"."ID") AS "ID" /*{id#RAW}*/, 
              BUILTIN_RESULT.TYPE_STRING("TRANSACTION".trandisplayname) AS trandisplayname /*{trandisplayname#RAW}*/, 
              BUILTIN_RESULT.TYPE_STRING("TRANSACTION"."TYPE") AS "TYPE" /*{type#RAW}*/, 
              BUILTIN_RESULT.TYPE_INTEGER(transactionLine.subsidiary) AS subsidiary /*{transactionlines.subsidiary#RAW}*/, 
              BUILTIN_RESULT.TYPE_INTEGER("TRANSACTION".postingperiod) AS postingperiod /*{postingperiod#RAW}*/, 
              BUILTIN_RESULT.TYPE_INTEGER(TransactionAccountingLine."ACCOUNT") AS "ACCOUNT" /*{transactionlines.accountingimpact.account#RAW}*/, 
              BUILTIN_RESULT.TYPE_INTEGER(transactionLine.entity) AS entity /*{transactionlines.entity#RAW}*/, 
              BUILTIN_RESULT.TYPE_INTEGER(transactionLine."CLASS") AS "CLASS" /*{transactionlines.class#RAW}*/, 
              BUILTIN_RESULT.TYPE_INTEGER(transactionLine.department) AS department /*{transactionlines.department#RAW}*/, 
              BUILTIN_RESULT.TYPE_INTEGER(transactionLine."LOCATION") AS "LOCATION" /*{transactionlines.location#RAW}*/, 
              BUILTIN_RESULT.TYPE_STRING("ACCOUNT".accttype) AS accttype /*{transactionlines.accountingimpact.account.accttype#RAW}*/, 
              BUILTIN_RESULT.TYPE_CURRENCY(transactionLine.foreignamount, BUILTIN.CURRENCY(transactionLine.foreignamount)) AS foreignamount /*{transactionlines.foreignamount#RAW}*/, 
              BUILTIN_RESULT.TYPE_CURRENCY(transactionLine.creditforeignamount, BUILTIN.CURRENCY(transactionLine.creditforeignamount)) AS creditforeignamount /*{transactionlines.creditforeignamount#RAW}*/, 
              BUILTIN_RESULT.TYPE_CURRENCY(transactionLine.debitforeignamount, BUILTIN.CURRENCY(transactionLine.debitforeignamount)) AS debitforeignamount /*{transactionlines.debitforeignamount#RAW}*/,
              transactionLine.uniquekey
            FROM 
              "TRANSACTION", 
              "ACCOUNT", 
              TransactionAccountingLine, 
              transactionLine
            WHERE  (( ( transactionaccountingline."account" = "account"."id"(+)
                     AND ( transactionline."transaction" =
                           transactionaccountingline."transaction"
                           AND transactionline."id" =
                           transactionaccountingline.transactionline ) )
                   AND "transaction"."id" = transactionline."transaction" ))
                AND (( Nvl(transactionline.mainline, 'F') = ?
                       AND Nvl(transactionline.taxline, 'F') = ?
                       AND transactionline."class" IN ( ? )
                       -- AND "account".accttype IN ( 'Expense' )
                       AND transactionline.subsidiary IN ( ? )
                       AND "transaction".postingperiod IN ( ? )
                       AND NVL("TRANSACTION".custbody_md_po_exp_allo_entry, 'F') = ? 
                       AND "TRANSACTION".posting = ? 
                       AND TransactionAccountingLine."ACCOUNT" IN (${sourceAccounts.join(',')})
                        )) `;

      return this.getResults(sql, [
        false,
        false,
        genClass,
        subsidiary,
        period,
        false,
        true
      ]);
    }

    getExpenseAllocatedTranData(subsidiary, period,sourceAccounts){
      let sql = `SELECT 
      BUILTIN_RESULT.TYPE_INTEGER("TRANSACTION"."ID") AS "ID" /*{id#RAW}*/, 
      BUILTIN_RESULT.TYPE_STRING("TRANSACTION".trandisplayname) AS trandisplayname /*{trandisplayname#RAW}*/,
      BUILTIN_RESULT.TYPE_BOOLEAN("TRANSACTION".custbody_md_po_exp_allo_entry) AS custbody_md_po_exp_allo_entry /*{custbody_md_po_exp_allo_entry#RAW}*/, 
      BUILTIN_RESULT.TYPE_STRING(transactionLine.memo) AS memo /*{transactionlines.memo#RAW}*/,
      BUILTIN_RESULT.TYPE_INTEGER(transactionLine.custcol_md_po_exp_allo_gen_fr_tran) AS custcol_md_po_exp_allo_gen_fr_tran /*{transactionlines.custcol_md_po_exp_allo_gen_fr_tran#RAW}*/, 
      BUILTIN_RESULT.TYPE_STRING("TRANSACTION"."TYPE") AS "TYPE" /*{type#RAW}*/, 
      BUILTIN_RESULT.TYPE_INTEGER(transactionLine.subsidiary) AS subsidiary /*{transactionlines.subsidiary#RAW}*/, 
      BUILTIN_RESULT.TYPE_INTEGER("TRANSACTION".postingperiod) AS postingperiod /*{postingperiod#RAW}*/, 
      BUILTIN_RESULT.TYPE_INTEGER(TransactionAccountingLine."ACCOUNT") AS "ACCOUNT" /*{transactionlines.accountingimpact.account#RAW}*/, 
      BUILTIN_RESULT.TYPE_INTEGER(transactionLine.entity) AS entity /*{transactionlines.entity#RAW}*/, 
      BUILTIN_RESULT.TYPE_INTEGER(transactionLine."CLASS") AS "CLASS" /*{transactionlines.class#RAW}*/, 
      BUILTIN_RESULT.TYPE_INTEGER(transactionLine.department) AS department /*{transactionlines.department#RAW}*/, 
      BUILTIN_RESULT.TYPE_INTEGER(transactionLine."LOCATION") AS "LOCATION" /*{transactionlines.location#RAW}*/, 
      BUILTIN_RESULT.TYPE_STRING("ACCOUNT".accttype) AS accttype /*{transactionlines.accountingimpact.account.accttype#RAW}*/, 
      BUILTIN_RESULT.TYPE_CURRENCY(transactionLine.foreignamount, BUILTIN.CURRENCY(transactionLine.foreignamount)) AS foreignamount /*{transactionlines.foreignamount#RAW}*/, 
      BUILTIN_RESULT.TYPE_CURRENCY(transactionLine.creditforeignamount, BUILTIN.CURRENCY(transactionLine.creditforeignamount)) AS creditforeignamount /*{transactionlines.creditforeignamount#RAW}*/, 
      BUILTIN_RESULT.TYPE_CURRENCY(transactionLine.debitforeignamount, BUILTIN.CURRENCY(transactionLine.debitforeignamount)) AS debitforeignamount /*{transactionlines.debitforeignamount#RAW}*/
    FROM 
      "TRANSACTION", 
      "ACCOUNT", 
      TransactionAccountingLine, 
      transactionLine
    WHERE 
      (
        (
          (
          TransactionAccountingLine."ACCOUNT" = "ACCOUNT"."ID"(+) 
          AND (
            transactionLine."TRANSACTION" = TransactionAccountingLine."TRANSACTION" 
                AND transactionLine."ID" = TransactionAccountingLine.transactionline
              )
          ) 
          AND "TRANSACTION"."ID" = transactionLine."TRANSACTION")
        )
        AND 
        (
          (
            "TRANSACTION".custbody_md_po_exp_allo_entry = ?
             AND transactionLine.subsidiary IN (?) 
             AND "TRANSACTION".postingperiod IN (?) 
             AND TransactionAccountingLine."ACCOUNT" IN (${sourceAccounts.join(',')})
             -- AND "ACCOUNT".accttype IN ('Expense') 
             AND NOT(transactionLine.custcol_md_po_exp_allo_gen_fr_tran IS NULL)
        )
      )`
      return this.getResults(sql, [
        true,
        subsidiary,
        period
      ])

    }

    getAllocationScheduleBySubsidiary(subsidiary) {
      let sql = `SELECT 
                                als.id   AS value,
                                als.NAME AS text
                                FROM   generalallocationschedule als
                                --INNER JOIN accountingPeriod ap ON ap.periodname = als.name 
                                WHERE  als.subsidiary = ?
                                --AND ap.isyear = ? `;
      return this.getResults(sql, [subsidiary]);
    }

    getResults(sql, params = []) {
      let rs = this.query.runSuiteQL({
        query: sql,
        params: params,
      });

      return rs.asMappedResults();
    }

    getPendingExpenseAllocationRecords(recId) {
      /* let sql = `SELECT 
                id,
                custrecord_md_po_exp_allo_scr_sub AS subsidiary,
                custrecord_md_po_exp_allo_scr_alloper AS period,
                custrecord_md_po_exp_allo_scr_allo_sch AS allocatioschedule,
                custrecord_md_po_exp_allo_scr_brand AS brand
                FROM customrecord_md_po_exp_allo_script 
                WHERE 
                custrecord_md_po_exp_allo_scr_status ='pending' 
                AND 
                custrecord_md_po_exp_allo_scr_sub not null
                AND
                custrecord_md_po_exp_allo_scr_alloper not null
                AND
                custrecord_md_po_exp_allo_scr_allo_sch not null
                AND
                custrecord_md_po_exp_allo_scr_brand not null`; */

      let sql = `SELECT 
      id,
      custrecord_md_po_exp_allo_scr_sub AS subsidiary,
      custrecord_md_po_exp_allo_scr_alloper AS period,
      custrecord_md_po_exp_allo_scr_allo_sch AS allocationschedule,
      custrecord_md_po_exp_allo_scr_brand AS brand
      FROM customrecord_md_po_exp_allo_script 
      WHERE id = ?`;

      return this.getResults(sql, [recId]);
    }

    getGenExpenseData(expenseData, weightData) {
      return expenseData.reduce((acc, actualExpense) => {
        let clone = Object.assign({}, actualExpense);
        clone.description = "Allocation Source " + clone.trandisplayname;
        clone.generatedFrom = "";
        clone.allocatedEntry = "T";
        clone.sourceline = true;

        acc.push(clone);

        let cloneAmount = null;

        let debitamount = clone.debitforeignamount;
        let creditamount = clone.creditforeignamount;

        if (debitamount) {
          cloneAmount = debitamount;
          clone.creditforeignamount = debitamount;
          clone.debitforeignamount = "";
        } else {
          cloneAmount = creditamount;
          clone.debitforeignamount = creditamount;
          clone.creditforeignamount ="";
        }

        let totalSum = 0;

        weightData.forEach((weight, i, coll) => {
          let weightClone = Object.assign({}, clone);
          weightClone.description = "Allocated Entry " + clone.trandisplayname;
          weightClone.generatedFrom = "";
          weightClone.allocatedEntry = "T";
          weightClone.class = weight.class;

          let debitamount = weightClone.debitforeignamount;
          let creditamount = weightClone.creditforeignamount;

          if (debitamount) {
            weightClone.debitforeignamount = "";
            weightClone.creditforeignamount = Number(
              (debitamount * (weight.weight / 100)).toFixed(2)
            );
            totalSum += weightClone.creditforeignamount;
            if (i === coll.length - 1) {
              let diff = totalSum - cloneAmount;
              // log.debug("diff", diff);
              if (diff) {
                weightClone.creditforeignamount =
                  weightClone.creditforeignamount - diff;
              }
            }
          } else {
            weightClone.creditforeignamount = "";
            weightClone.debitforeignamount = Number(
              (creditamount * (weight.weight / 100)).toFixed(2)
            );
            totalSum += weightClone.debitforeignamount;
            if (i === coll.length - 1) {
              let diff = totalSum - cloneAmount;
              // log.debug("diff", diff);
              if (diff) {
                weightClone.debitforeignamount =
                  weightClone.debitforeignamount - diff;
              }
            }
          }

          acc.push(weightClone);
        });
        return acc;
      }, []);
    }
    createJournalEntry(body, lines) {
      log.debug("createJournalEntry", { body, lines });
      let journalEntry = this.record.create({
        type: this.record.Type.JOURNAL_ENTRY,
        isDynamic: true,
      });

      Object.keys(body).forEach((fieldId) => {
        let value = body[fieldId];
        journalEntry.setValue({
          fieldId,
          value,
        });
      });

      lines.forEach((line) => {
        journalEntry.selectNewLine({
          sublistId: constants.RECORDS.JOURNAL_ENTRY.SUBLISTS.LINE.ID,
        });

        Object.keys(line).forEach((fieldId) => {
          let value = line[fieldId];

          if (value) {
            journalEntry.setCurrentSublistValue({
              sublistId: constants.RECORDS.JOURNAL_ENTRY.SUBLISTS.LINE.ID,
              fieldId,
              value,
            });
          }
        });

        journalEntry.commitLine({
          sublistId: constants.RECORDS.JOURNAL_ENTRY.SUBLISTS.LINE.ID,
        });
      });

      journalEntry.save();
      return journalEntry;
    }

    getRelatedJournalEntries(subsidiary, generatedFromTranIds) {
      let sql = `SELECT DISTINCT
      BUILTIN_RESULT.TYPE_INTEGER("TRANSACTION"."ID") AS "ID" /*{id#RAW}*/
    FROM 
      "TRANSACTION", 
      transactionLine
    WHERE 
      "TRANSACTION"."ID" = transactionLine."TRANSACTION"
       AND (("TRANSACTION".custbody_md_po_exp_allo_entry = ? 
       AND transactionLine.subsidiary IN (?) 
       AND transactionLine.custcol_md_po_exp_allo_gen_fr_tran IN (${generatedFromTranIds.join(',')}) 
       AND "TRANSACTION"."TYPE" IN ('Journal'))) `;

      return this.getResults(sql, [true, subsidiary]);
    }

    deleteJournal(id) {
      this.record.delete({
        id: id,
        type: this.record.Type.JOURNAL_ENTRY,
      });
    }

    createExpenseAllocation(subsidiary, period, allocationschedule, brand) {
      let expenseAllocation = this.record.create({
        type: "customrecord_md_po_exp_allo_script",
        isDynamic: true,
      });

      expenseAllocation.setValue({
        fieldId: "custrecord_md_po_exp_allo_scr_sub",
        value: subsidiary,
      });
      expenseAllocation.setValue({
        fieldId: "custrecord_md_po_exp_allo_scr_alloper",
        value: period,
      });
      expenseAllocation.setValue({
        fieldId: "custrecord_md_po_exp_allo_scr_allo_sch",
        value: allocationschedule,
      });
      expenseAllocation.setValue({
        fieldId: "custrecord_md_po_exp_allo_scr_brand",
        value: brand,
      });

      expenseAllocation.save();
      return expenseAllocation;
    }

    executeExpenseMRTask(recId) {
      let mrTask = null;
      if (this.task) {
        mrTask = this.task.create({
          taskType: this.task.TaskType.MAP_REDUCE,
          scriptId: "customscript_md_po_mr_expense_allocation",
          deploymentId: "customdeploy_md_po_mr_expense_allocation",
          params: {
            custscript_md_po_mr_exp_all_rec: recId,
          },
        });

        let t= mrTask.submit();
        return t;
      }
      return mrTask;
    }
    getScriprtParametersById(id) {
      let currentScript = this.runtime.getCurrentScript();
      let brand = currentScript.getParameter({
        name: id,
      });
      return brand;
    }
  }

  return Gateway;
});
