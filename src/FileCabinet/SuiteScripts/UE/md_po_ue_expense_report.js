/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/action', 'N/file', 'N/query', 'N/record', 'N/render'],
    /**
 * @param{action} action
 * @param{file} file
 * @param{query} query
 * @param{record} record
 * @param{render} render
 */
    (action, file, query, record, render) => {
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
            log.error("beforeLoad", "beforeLoad");
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
            log.error("beforeSubmit", "beforeSubmit");
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
            log.error("afterSubmit", "afterSubmit");
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
