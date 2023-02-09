/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/query', 'N/ui/serverWidget','N/runtime'],
    /**
 * @param{query} query
 * @param{serverWidget} serverWidget
 * @param{runtime} runtime
 */
    (query, serverWidget,runtime) => {
        const CST = {
            TRANSLATIONS:{
                CREATE_IF_BTN:'Create Item Fulfillment'
            },
            
            STR_CST:{
                CREATE_IF_BTN:'custpage_md_po_sd_if_btn'
            },
            RECORDS:{
                SHIPPING_DETAILS:{
                    ID:'customtransaction_potr_po_sd',
                    FIELDS:{
                        RELATED_IF:'custbody_potr_related_if',
                        RELATED_PO:'custbody_potr_po_sd_po'
                    }
                }
            }
        };
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            log.error('beforeLoad',{type:scriptContext.type,ec:runtime.executionContext,v:scriptContext.UserEventType.VIEW,c:(runtime.executionContext === runtime.ContextType.USER_INTERFACE && scriptContext.type === scriptContext.UserEventType.VIEW)});
            if(runtime.executionContext === runtime.ContextType.USER_INTERFACE && scriptContext.type === scriptContext.UserEventType.VIEW){
                log.error('beforeLoad in');
                let {newRecord,form} = scriptContext;
                let relatedIF = newRecord.getValue({
                    fieldId: CST.RECORDS.SHIPPING_DETAILS.FIELDS.RELATED_IF
                });
                let relatedPO = newRecord.getValue({
                    fieldId: CST.RECORDS.SHIPPING_DETAILS.FIELDS.RELATED_PO
                });

                if(!relatedIF && relatedPO){
                    form.addButton({
                        id:CST.STR_CST.CREATE_IF_BTN,
                        label:CST.TRANSLATIONS.CREATE_IF_BTN,
                        functionName:'handleIFButtonClick'
                    });

                    form.clientScriptModulePath = '../CS/md_po_cs_shipping_details'
                }
            }

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

        }

        return {beforeLoad/* , beforeSubmit, afterSubmit */}

    });
