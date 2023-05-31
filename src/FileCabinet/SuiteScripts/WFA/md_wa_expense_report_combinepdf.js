/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/file', 'N/query', 'N/record', 'N/render', 'N/runtime', 'N/search', 'N/url'],
    /**
 * @param{file} file
 * @param{query} query
 * @param{record} record
 * @param{render} render
 * @param{runtime} runtime
 * @param{search} search
 * @param{url} url
 */
    (file, query, record, render, runtime, search, url) => {
        /**
         * Defines the WorkflowAction script trigger point.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
         * @param {string} scriptContext.type - Event type
         * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
         * @since 2016.1
         */
        const onAction = (scriptContext) => {
            try {
                log.debug('combine pdf onAction', scriptContext);

                // Get the expense report ID from the current record
                var expenseReportId = scriptContext.newRecord.id;

                let expenseReport = record.load({
                    type: scriptContext.newRecord.type,
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

                    if (filteredAttachments.length > 0) {

                        let pdfs = filteredAttachments.map(attachment => {
                            let contents = attachment.getContents();;
                            if (attachment.fileType === file.Type.PDF) {
                                return `<pdf src="data:application/pdf;base64,${contents}" />`;
                            } else {
                                return `<pdf><body><img width="500pt" height="500pt" src="data:image/png;base64,${contents}" /></body></pdf>`;
                            }
                        });
                        let combinedPdfContent = `<pdfset>${pdfs.join('')}</pdfset>`;
                        let combinedPdf = render.xmlToPdf({
                            xmlString: combinedPdfContent
                        });

                        let folderId = getExpenseReportFolderId();
                        let fileName = `Expense Report ${tranid}.pdf`;
                        combinedPdf.folder = folderId;
                        combinedPdf.name = fileName;
                        let combinePdfFileId = combinedPdf.save();

                        record.submitFields({
                            type: scriptContext.newRecord.type,
                            id: expenseReportId,
                            values: {
                                custbody_potr_combined_pdf: combinePdfFileId
                            }
                        });
                        log.audit('combinePdfFileId', combinePdfFileId);
                    } else {
                        record.submitFields({
                            type: scriptContext.newRecord.type,
                            id: expenseReportId,
                            values: {
                                custbody_potr_comb_pdf_remarks: 'No PDF or Image attachments found.'
                            }
                        });
                        log.audit('No PDF or Image attachments found.');
                    }
               
            } catch (e) {
                log.error('Error', e);
            }

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

        return { onAction };
    });
