/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/https','N/url'],

function(https,url) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {

    }

    function saveRecord(scriptContext){
        let currentRecord = scriptContext.currentRecord;
        let brand = scriptContext.currentRecord.getValue('custpage_sl_bdgt_brand');
        let year = scriptContext.currentRecord.getValue('custpage_sl_bdgt_year');
        if(year && brand){
            let mode = "checkAllocationSchedule";
            let surl = url.resolveScript({
                scriptId: 'customscript_md_po_sl_brand_budget',
                deploymentId: 'customdeploy_md_po_sl_brand_budget',
                params:{
                    brand,year,mode
                }
            });
            let response = https.get({
                url:surl
            });

            let body = JSON.parse(response.body);

            if(body.status === 'failed'){
                alert(body.details.errors);
                return false;
            }

        }else{
            
            return true;
        }

        return true;

    }

   

    return {
        pageInit: pageInit,
        saveRecord:saveRecord,
       handleclick:function(){
        location.href = location.href + "&mode=genAllocation";
       }
    };
    
});
