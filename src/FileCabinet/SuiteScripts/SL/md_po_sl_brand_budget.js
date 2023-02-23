/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/task", "N/ui/serverWidget", "N/redirect", "N/https", "N/query"]
/**
 * @param{task} task
 * @param{serverWidget} serverWidget
 * @param{redirect} redirect
 * @param{https} https
 */, (task, serverWidget, redirect, https, query) => {
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
      if (request.method === https.Method.GET) {
        let mode = request.parameters["mode"];
        if (mode === "genAllocation") {
          let id = handleAllocationScriptSubmit();
          let rs = query
            .runSuiteQL({
              query: `select s.id, ds.primarykey from script s inner join deploymentsScript  ds on  s.id =ds.owner  where s.scriptid ='customscript_md_po_mr_brand_bdgt_allo'`,
            })
            .asMappedResults();
          redirect.redirect({
            url: "/app/common/scripting/mapreducescriptstatus.nl",
            parameters: {
              scripttype: rs[0].id,
              primarykey: rs[0].primarykey,
            },
          });
          return;
        }
      }

      let form = serverWidget.createForm({
        title: "Budget Allocation",
      });

      form.addButton({
        label: "Generate Allocation",
        id: "custpage_btn_gen_all",
        functionName: "handleclick",
      });

      form.clientScriptModulePath = "../CS/md_po_cs_brand_budget";

      response.writePage({
        pageObject: form,
      });
    } catch (e) {
      throw e;
    }
  };

  function handleAllocationScriptSubmit() {
    let sstask = task.create({
      taskType: task.TaskType.MAP_REDUCE,
      scriptId: "customscript_md_po_mr_brand_bdgt_allo",
      deploymentId: "customdeploy_md_po_mr_brand_bdgt_allo",
    });

    return sstask.submit();
  }

  return { onRequest };
});
