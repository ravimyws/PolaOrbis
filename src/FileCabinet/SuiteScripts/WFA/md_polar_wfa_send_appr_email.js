/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType WorkflowActionScript
 *
 * Name: Polar WFA Email Approver
 * Version: 1
 *
 * Lafira Solutions Ltd.
 * Author: Timothy Wong
 * Date: 2022-10-25
 *
 * Script: _polar_wfa_email_appr
 * Deploy: _polar_wfa_email_appr
 *
 * @module
 * @description
 *
 * Changelog
 * * -- Version 1.1 - Timothy Wong || 2023-05-25
    --- email body function rewrite to include when mainline is 0.
    --- change memo to display COA name if blank.
 
 * -- Version 1.0 - Timothy Wong || 2022-10-25
    --- Initial Code release
 *
 *
 */

define(["N/record","N/search", "N/runtime", "N/url", "N/email","N/format/i18n","N/file",'N/query','N/render'], function (record,search, runtime, url, email, cur, file, query, render) {
    /**
     * @function onAction
     * @description description
     *
     * @public
     * @param  {Object} context.newRecord  - New record
     * @param  {Object} context.oldRecord  - Old record
     * @param  {Object} context.form       - serverWidget.form
     * @param  {Object} context.type       - event type || create/edit/view/delete
     * @param  {Object} context.workflowId - Internal ID of the workflow.
     * @return {variable}                  - returns to field in Workflow.
     */

    function onAction(context) {
        try {
           // Get the expense report ID from the current record
                var expenseReportId = context.newRecord.id;

                let expenseReport = record.load({
                    type: context.newRecord.type,
                    id: expenseReportId
                });
                let tranid = expenseReport.getValue('tranid');

                // let combinedPdfFileId = expenseReport.getValue('custbody_potr_combined_pdf');



                    let attachments = getFiles(expenseReportId);
                    log.debug("attachments", attachments);

                    let filteredAttachments = attachments.filter(attachment => {
                        return (attachment.fileType === file.Type.PDF || attachment.fileType === file.Type.JPGIMAGE || attachment.fileType === file.Type.PNGIMAGE);
                    });
                    log.debug("filteredAttachments", filteredAttachments);

                    var combinePdfFileId;
          
                    if (filteredAttachments.length > 0) {

                        let pdfs = filteredAttachments.map(attachment => {
                            let contents = attachment.getContents();
                            if (attachment.fileType === file.Type.PDF) {
                                return `<pdf src="data:application/pdf;base64,${contents}" />`;
                            } else {
                              //return `<pdf src="data:application/pdf;base64,${contents}" />`;
                              //return `<pdf><body ><img style="width:auto;max-height: 300px" src="data:image/png;base64,${contents}" /></body></pdf>`;
                              return `<pdf>
                              <head>
                              <style type="text/css">*{
                                 img {
                                     object-fit: contain;
                                 }
                              }
                              </style>
                              </head>
                              <body width="540mm" height="600mm">
                              <img dpi="90" src="data:image/png;base64,${contents}" />
                              </body>
                              </pdf>`;
                            }
                        });

                        //const isOnlyOnePDF = (filteredAttachments.length == 1 && filteredAttachments[0].fileType === file.Type.PDF);
                        const isAllAttachmentsPDF = filteredAttachments.every(attachment => attachment.fileType === file.Type.PDF);
                        if(isAllAttachmentsPDF){
                            const dummy64Image=`data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAeAB4AAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAGQAlgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/9k=`;
                            const dummeyImage =  `<pdf>
                            <head>
                            <style type="text/css">*{
                               img {
                                   object-fit: contain;
                               }
                            }
                            </style>
                            </head>
                            <body width="540mm" height="600mm">
                            <img dpi="90" src="${dummy64Image}" />
                            </body>
                            </pdf>`;
                            pdfs.push(dummeyImage);
                        }
                        let folderId = getExpenseReportFolderId();
                        let fileName = `Expense Report ${tranid}.pdf`;
                        //if(!isOnlyOnePDF){
                        let combinedPdfContent =`<pdfset>${pdfs.join('')}</pdfset>`;

                        log.debug("combined pdf content", combinedPdfContent)
                        let combinedPdf = render.xmlToPdf({
                            xmlString: combinedPdfContent
                        });

                        
                        combinedPdf.folder = folderId;
                        combinedPdf.name = fileName;
                        combinePdfFileId = combinedPdf.save();
                    // } else {
                    //     const pdfFileId = filteredAttachments[0].id;
                    //     log.debug("cnew pdf f", {
                    //         id: Number(pdfFileId),
                    //         folder: Number(folderId),
                    //         conflictResolution: file.NameConflictResolution.RENAME_TO_UNIQUE
                    //     });
                    //     let newPdf = file.copy({
                    //         id: Number(pdfFileId),
                    //         folder: Number(folderId),
                    //         conflictResolution: file.NameConflictResolution.RENAME_TO_UNIQUE
                    //     });
                    //     // newPdf.name = fileName;
                    //     // log.debug("cnew pdf", newPdf.id)
                    //     // combinePdfFileId = newPdf.save();

                    //     combinePdfFileId = newPdf.id;
                    // }

                        record.submitFields({
                            type: context.newRecord.type,
                            id: expenseReportId,
                            values: {
                                custbody_potr_combined_pdf: combinePdfFileId
                            }
                        });
                        log.audit('combinePdfFileId', combinePdfFileId);
                    } else {
                        record.submitFields({
                            type: context.newRecord.type,
                            id: expenseReportId,
                            values: {
                                custbody_potr_comb_pdf_remarks: 'No PDF or Image attachments found.'
                            }
                        });
                        log.audit('No PDF or Image attachments found.');
                    }



          
            var rec = context.newRecord;
            var recId = rec.id;
            var recType = context.newRecord.type;
            var nextApp = rec.getValue({
    			fieldId: 'custbody_potr_vb_next_appr'
                });

            var recUrl = url.resolveRecord({
                recordType: recType,
                recordId: recId,
                isEditmode: false
            });

            var approverObj = getNextApprover(rec);
            var approver = approverObj.approver;
            var createdById = rec.getValue("custbody_potr_created_by");

            if(nextApp){
                        record.submitFields({
                            type: recType,
                            id: recId,
                            values: {custbody_potr_vb_appr_sts: 1},
                        });
                       approver = nextApp;
            } else {
              record.submitFields({
                            type: recType,
                            id: recId,
                            values: {custbody_potr_vb_next_appr: approver, custbody_potr_vb_appr_sts: 1},
                             });
            };


            if (approverObj.isEmailApprove) {
                
                var getEmail = search.lookupFields({
                    type: "employee",
                    id: approver,
                    columns: ["email", "firstname"]
                });
                var emailBodyObj = createEmailBody({recId: recId, firstName:getEmail.firstname, recType: recType, recUrl: recUrl});
                var emailId = 0;
                var pdfId = combinePdfFileId;
                log.debug('pdf ID',pdfId);

                if (pdfId){
                    var pdfFile = file.load({id: pdfId});
                    log.debug("PDF file", pdfFile);
                    var fileArr = [pdfFile]
                } else {
                    var fileArr = getFiles(recId);
                };
                if (emailBodyObj.uniqueVbArr.length > 0) {
                    var subject = emailBodyObj.documentNumber +
                  " created by " +
                  emailBodyObj.createdBy +
                  " is pending your approval.";
                    log.audit({title:"EmailObj",details:JSON.stringify({
                    author: createdById,
                    recipients: getEmail.email,
                    subject: subject,
                    body: emailBodyObj.xmlStr,
                })});
                    var emailObj = {
                        author: "28",
                        body: emailBodyObj.xmlStr,
                        recipients: getEmail.email,
                        subject: subject,
                        relatedRecords:{
                            transactionId:recId
                        }
                    };
                    (fileArr.length>0)?emailObj["attachments"] = fileArr:"";
                    emailId = email.send(emailObj);
                }
                log.debug("employee:" + approver, "emailId:" + emailId);
            }
        } catch (e) {
            var scriptId = runtime.getCurrentScript().id;
            log.error(
                "ERROR:" + scriptId + ":fn.onAction:" + runtime.executionContext,
                JSON.stringify({
                    type: e.type,
                    name: e.name,
                    message: e.message,
                    stack: e.stack,
                    cause: JSON.stringify(e.cause),
                    id: e.id,
                })
            );
        }
        var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
        log.debug("onAction", "remainingUsage: " + remainingUsage);
        return true;
    }



 // Get all attachments on the expense report
        function getFiles(recId) {
            var fileArr = [];

            var transactionSearchObj = search.create({
                type: "transaction",
                filters:
                    [
                        ["internalid", "anyof", recId],
                        "AND",
                        ["mainline", "is", "T"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            join: "file",
                            label: "Internal ID"
                        }),
                        search.createColumn({
                            name: "name",
                            join: "file",
                            label: "Name"
                        })
                    ]
            });
            var searchResultCount = transactionSearchObj.runPaged().count;
            log.debug("transactionSearchObj result count", searchResultCount);
            transactionSearchObj.run().each(function (result) {
                var fileId = result.getValue({
                    name: "internalid",
                    join: "file"
                });
                log.audit("fileId:", fileId);
                if (fileId) {
                    var fileObj = file.load({ id: fileId });
                    fileArr.push(fileObj);
                }
                return true;
            });
            return fileArr;
        }

        function getExpenseReportFolderId() {
            let folderId = getExpenseReportFolderBySearch();
            if (folderId) {
                return folderId;
            } else {
                let folder = record.create({
                    type: record.Type.FOLDER,
                });
                folder.setValue({
                    fieldId: 'name',
                    value: 'Expense Report Attachments'
                });
                return folder.save();
            }
        }

        function getExpenseReportFolderBySearch() {
            var folderSearchObj = search.create({
                type: "folder",
                filters:
                    [
                        ["name", "startswith", "Expense Report Attachments"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC,
                            label: "Name"
                        })
                    ]
            });

            let rs = folderSearchObj.run().getRange({
                start: 0,
                end: 1
            });

            return rs.length > 0 ? rs[0].id : null;


        }


  
    function getNextApprover(rec) {
        var createdBy = rec.getValue("custbody_potr_created_by");
        var exchangeRate;
        if (rec.type == "vendorbill"){
          exchangeRate = rec.getValue("exchangerate")
        }else{
          exchangeRate = rec.getValue("expensereportexchangerate")          
        };
        var totalAmt = +rec.getValue("total") * +exchangeRate;
        var approver, isEmailApprove;
      log.debug("james",JSON.stringify({totalAmt:totalAmt,createdBy:createdBy}));
        var customrecord_potr_vb_appr_matSearchObj = search.create({
            type: "customrecord_potr_vb_appr_mat",
            filters: [
                ["custrecord_potr_appr_matx_amt", "lessthanorequalto", totalAmt],
                "AND",
                ["custrecord_potr_appr_matx_creator", "anyof", createdBy],
            ],
            columns: [
                "scriptid",
                "custrecord_potr_appr_matx_creator",
                search.createColumn({
                    name: "custrecord_potr_appr_matx_amt",
                    sort: search.Sort.DESC,
                }),
                "custrecord_potr_appr_matx_approver",
                "custrecord_potr_appr_matx_email",
            ],
        });
        var searchResultCount = customrecord_potr_vb_appr_matSearchObj.runPaged().count;
        log.debug("customrecord_potr_vb_appr_matSearchObj result count", searchResultCount);

        if(searchResultCount){
            
            customrecord_potr_vb_appr_matSearchObj.run().each(function (result) {
                approver = result.getValue("custrecord_potr_appr_matx_approver");
                isEmailApprove = result.getValue("custrecord_potr_appr_matx_email");
    
                return false;
            });

        }else{

            var otherCreatorSearchObj = search.create({
                type: "customrecord_potr_vb_appr_mat",
                filters: [
                    ["custrecord_potr_appr_matx_amt", "lessthanorequalto", totalAmt],
                    "AND",
                    ["custrecord_potr_appr_matx_creator", "anyof", "@NONE@"],
                ],
                columns: [
                    "scriptid",
                    "custrecord_potr_appr_matx_creator",
                    search.createColumn({
                        name: "custrecord_potr_appr_matx_amt",
                        sort: search.Sort.DESC,
                    }),
                    "custrecord_potr_appr_matx_approver",
                    "custrecord_potr_appr_matx_email",
                ],
            });
            var searchResultCount2 = otherCreatorSearchObj.runPaged().count;
            log.debug("otherCreatorSearchObj result count", searchResultCount2);
                        
            otherCreatorSearchObj.run().each(function (result) {
                approver = result.getValue("custrecord_potr_appr_matx_approver");
                isEmailApprove = result.getValue("custrecord_potr_appr_matx_email");
                return false;
            });

        }

        return {approver: approver, isEmailApprove: isEmailApprove};
    }

    function createEmailBody(opts) {
        var recId = opts.recId;
        var firstName = opts.firstName;
        var recType = opts.recType;
        var recUrl = opts.recUrl;
        var date, createdBy, documentNumber, mainEntity, totalAmount, baseCurrency;
        var itemTable = "";
        var vbArr = [];
        var curFormatter = cur.getCurrencyFormatter({currency: "USD"});

        var vsearchObj = search.create({
            type: recType,
            filters: [["internalid", "anyof", recId]],
            columns: [
                search.createColumn({name: "mainline", label: "*"}),
                search.createColumn({name: "trandate", label: "Date"}),
                search.createColumn({name: "tranid", label: "Transaction Number"}),
                search.createColumn({name: "entity", label: "Name"}),
                search.createColumn({name: "item", label: "Item"}),
                search.createColumn({name: "expensecategory", label: "Expense Category"}),
                search.createColumn({name: "memo", label: "Memo"}),
                search.createColumn({name: "amount", label: "Amount"}),
                search.createColumn({
                    name: "type",
                    join: "account",
                    label: "Account Type",
                }),
                search.createColumn({name: "custbody_potr_created_by", label: "Created By"}),
                search.createColumn({name: "departmentnohierarchy", label: "Department"}),
                search.createColumn({name: "classnohierarchy", label: "Class"}),
                search.createColumn({name: "altname", join: "customer", label: "customer"}),
                search.createColumn({name: "currency", join: "subsidiary", label: "Base Currency"}),
                search.createColumn({name: "account", label: "Account"})
            ],
        });
        vsearchObj.run().each(function (result) {
            vbArr.push(result.id);
            var itemId = "";
            //var mainLine = result.getValue("mainline");
            var isMainline = result.getValue("mainline");
            var entity;
            isMainline == "*"? (totalAmount = curFormatter.format({number:+result.getValue("amount")})):"";
            isMainline == "*"? (baseCurrency = result.getText({name: "currency", join: "subsidiary"})):"";
            isMainline == "*"? (date = result.getValue("trandate")) : "";
            isMainline == "*"? (createdBy = result.getText("custbody_potr_created_by")) : "";
            isMainline == "*"? (documentNumber = result.getValue("tranid")) : "";
            isMainline == "*"? itemId : (itemId = result.getText("item") || result.getText("expensecategory"));
            isMainline == "*"? (mainEntity = result.getText("entity")) : (entity = result.getValue({name: "altname", join: "customer"}));
            if ((isMainline!="*")&&+result.getValue("amount") > 0) {
                var memo = result.getValue("memo") || result.getText("account");                
                itemTable =
                    itemTable +
                    `<tr>
                  <td class="tg-0la">${entity}</td>
                  <td class="tg-0la">${result.getText("departmentnohierarchy")}</td>
                  <td class="tg-0la">${result.getText("classnohierarchy")}</td>
                  <td class="tg-0la">${itemId}</td>
                  <td class="tg-0la">${memo}</td>
                  <td class="tg-0la">${curFormatter.format({number:+result.getValue("amount")})}</td>
                  </tr>`;
            }
            // .run().each has a limit of 4,000 results
            return true;
        });
        itemTable =
            itemTable +
            `</thead>
            </table>`;
        var uniqueVbArr = vbArr.filter((v, i, a) => a.indexOf(v) === i);

        var xmlStr = createXML({
            vbArr: uniqueVbArr,
            itemTable: itemTable,
            date: date,
            createdBy: createdBy,
            documentNumber: documentNumber,
            mainEntity: mainEntity,
            totalAmount:totalAmount,
            baseCurrency:baseCurrency,
            firstName:firstName,
            recType: recType,
            recUrl: recUrl
        });

        return {xmlStr: xmlStr, uniqueVbArr: uniqueVbArr, createdBy: createdBy, documentNumber: documentNumber};
    }

    function createXML(opts) {
        var vbArr = opts.vbArr;
        var recType = opts.recType;
        var itemTable = opts.itemTable;
        var recUrl = opts. recUrl;

        var approveLink = url.resolveScript({
            deploymentId: "customdeploy_sl_md_polar_linkappr",
            scriptId: "customscript_sl_md_polar_linkappr",
            params: {vbArr: JSON.stringify(vbArr), isApproveAll: true, recType: recType},
            returnExternalUrl: true,
        });
        var rejectLink = url.resolveScript({
            deploymentId: "customdeploy_sl_md_polar_linkappr",
            scriptId: "customscript_sl_md_polar_linkappr",
            params: {vbArr: JSON.stringify(vbArr), isApproveAll: false, recType: recType},
            returnExternalUrl: true,
        });

        //https://7060938-sb1.app.netsuite.com/core/media/media.nl?id=3262&c=7060938_SB1&h=CqA9aOXDAO5EUSSimB7VTQVUZGARgEydben_pGraXhLNGGk0
        ///core/media/media.nl?id=3116&c=7060938_SB1&h=yK_0qut3e0tN8xvRIDGmsqCM8SzS1EluyxhRJyYdcdkvTmgW

        var header = `
      <style type="text/css">
      .tg-0lax{text-align:left; vertical-align:top; text-decoration: underline}
      </style>
      <body style="font-family:Verdana,Arial,Helvetica,sans-serif;font-size:10pt;">
      <div style="color:transparent;visibility:hidden;opacity:0;font-size:0px;border:0;max-height:1px;width:1px;margin:0px;padding:0px;border-width:0px!important;display:none!important;line-height:0px!important;">
          <img border="0" width="1" height="1" src="http://click.netsuite.com/q/DmjMGVtDOnbcFU2BcMxAPQ~~/AALN9wA~/RgRlMjIHPVcDc3BjQgpjTof-UGPcIb0JUhdicmlhbkBtb3Rpdi1kaWdpdGFsLmNvbVgEAAAAAQ~~" alt=""></div>
      <table style="padding: 5px; min-width: 350px; max-width: 640px; margin-left: auto; margin-right: auto; line-height: 20px;">
          <tr>
              <td style="width: 100%; background-color: #0f0f0f">
                  <img alt="header-banner" src="https://7060938-sb1.app.netsuite.com/core/media/media.nl?id=3262&c=7060938_SB1&h=CqA9aOXDAO5EUSSimB7VTQVUZGARgEydben_pGraXhLNGGk0" style="width: 100%; max-width: 100% !important; height: auto;">
              </td>
          </tr>
          <tr>
              <td style="width: 100%; padding: 2%; font-family: 'Oracle Sans', Arial, sans-serif; font-size: 12pt; color: #312d2b;">
              <p>Hi ${opts.firstName},</p>
              <p>${opts.recType} ${opts.documentNumber} dated ${opts.date} for ${opts.mainEntity} created by ${opts.createdBy} is waiting for your approval.</p>
              <p> The total approval amount is ${opts.baseCurrency} ${opts.totalAmount}.</p>
              <p>To approve or reject this document through this email, please click:</p>
              <p>
              <table style="width: 100%;">
                  <tr>
                      <td style="width: 5%;"></td>
                      <td style="background-color: #EEA356; width: 100px; padding: 10px 0; text-align: center; font-family: 'Oracle sans'; font-weight: 500; cursor: pointer;">
                          <a href="${approveLink}" style="text-decoration: none;"><span style="color: #000000 !important; width: 100%; display: block;">
                  Approve</span></a></td>
      <td style="width: 10%; font-weight: normal; text-align: center;">or</td>
      <td style="background-color: #EEA356; width: 100px;padding: 10px 0; text-align: center; font-family: 'Oracle sans'; font-weight: 500; cursor: pointer;"><a href="${rejectLink}" style="text-decoration: none;">
              <span style="color: #000000 !important; width: 100%; display: block;">Reject</span>
          </a></td>
      <td style="width: 5%;"></td>
  </tr>
</table>
                      <p></p>
                      <p></p>
                      <p></p>
                      <p></p>
                      <p></p>
                      <table class="tg">
                      <thead>
                        <tr>
                        <td class="tg-0lax">Customer&nbsp;&nbsp;</td>
                        <td class="tg-0lax">Department&nbsp;&nbsp;</td>
                        <td class="tg-0lax">Class&nbsp;&nbsp;</td>
                        <td class="tg-0lax">Item&nbsp;&nbsp;</td>
                        <td class="tg-0lax">Memo&nbsp;&nbsp;</td>
                        <td class="tg-0lax">Amount(${opts.baseCurrency})&nbsp;&nbsp;</td>
                        </tr>`;

        var footer = `<p></p>
                <p><a href="${recUrl}">Click here to view the record</a></p>
                    <p>Notes:</p>
                <ul>
                    <li>By pressing the approve button, all the items listed in the table above will be approved.</li>
                    <li>By pressing the reject button, you will be redirected to where you can input a reject reason and reject the vendor bill.</li>
                </ul>
                </td>
                </tr>
                <tr>
                <td>
                <p> Custom SuiteEmail Approval - Powered by Motiv Digital Ltd.
                </td>
                </tr>
                </table>
                <img border="0" width="1" height="1" alt="" src="http://click.netsuite.com/q/1_qI76DhKm4GYgK1cg7_pw~~/AALN9wA~/RgRlMjIHPlcDc3BjQgpjTof-UGPcIb0JUhdicmlhbkBtb3Rpdi1kaWdpdGFsLmNvbVgEAAAAAQ~~">
                </body>`;
        return header + itemTable + footer;
    }

    function getFiles(recId){
        var fileArr = [];

        var transactionSearchObj = search.create({
            type: "transaction",
            filters:
            [
                ["internalid","anyof",recId],
                "AND",
                ["mainline","is","T"]
            ],
            columns:
            [
                search.createColumn({
                  name: "internalid",
                  join: "file",
                  label: "Internal ID"
               }),
                search.createColumn({
                  name: "name",
                  join: "file",
                  label: "Name"
               })
            ]
         });
        var searchResultCount = transactionSearchObj.runPaged().count;
        log.debug("transactionSearchObj result count",searchResultCount);
        transactionSearchObj.run().each(function(result){
            log.debug({title:"result",details:JSON.stringify(result)});
            var fileId = result.getValue({
                name: "internalid",
                join: "file"
             });
            log.audit("fileId:",fileId);
            if(fileId){
                var fileObj = file.load({id:fileId});
                fileArr.push(fileObj);
            }
            return true;
        });
        return fileArr;
    }

    return {
        onAction: onAction,
    };
});