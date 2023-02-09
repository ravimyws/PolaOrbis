/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/query', 'N/record', 'N/redirect', 'N/https'],
    /**
 * @param{query} query
 * @param{record} record
 * @param{redirect} redirect
 * @param{https} https
 */
    (query, record, redirect, https) => {
        const CST = {
            TRANSLATIONS: {
                CREATE_IF_BTN: 'Create Item Fulfillment'
            },

            STR_CST: {
                CREATE_IF_BTN: 'custpage_md_po_sd_if_btn',
                MODES: {
                    CREATE_IF_ACTION: 'createIFAction'
                }
            },
            RECORDS: {
                SHIPPING_DETAILS: {
                    ID: 'customtransaction_potr_po_sd',
                    FIELDS: {
                        RELATED_IF: 'custbody_potr_related_if',
                        RELATED_PO: 'custbody_potr_po_sd_po'
                    },
                    SUBLISTS: {
                        LINE: {
                            ID: 'line',
                            FIELDS: {
                                ITEM_CODE: 'custcol_potr_po_sd_item',
                                QUANTITY_SHIPPED: 'custcol_potr_po_sd_spd'
                            }
                        }
                    }
                }
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
            let shippingDetailsRecord = null;
            try {
                if (request.method === https.Method.GET) {
                    let params = request.parameters;
                    log.error('params', params);
                    if (params.mode === CST.STR_CST.MODES.CREATE_IF_ACTION && params.sdId) {

                        shippingDetailsRecord = getRecord(CST.RECORDS.SHIPPING_DETAILS.ID, params.sdId, true);
                        log.error('shippingDetailsRecord', shippingDetailsRecord.id);
                        let relatedIF = shippingDetailsRecord.getValue({
                            fieldId: CST.RECORDS.SHIPPING_DETAILS.FIELDS.RELATED_IF
                        });
                        let relatedPO = shippingDetailsRecord.getValue({
                            fieldId: CST.RECORDS.SHIPPING_DETAILS.FIELDS.RELATED_PO
                        });

                        if (!relatedIF && relatedPO) {

                            let poRecord = getRecord(record.Type.PURCHASE_ORDER, relatedPO, true);
                            log.error('poRecord', poRecord.id);

                            let relatedSo = poRecord.getValue('createdfrom');
                            let soCustomer = null;
                            let soLocation = null;
                            let soItemLineData = [];

                            if (relatedSo) {

                                let soRecord = getRecord(record.Type.SALES_ORDER, relatedSo, true);
                                log.error('soRecord', soRecord.id);
                                soCustomer = soRecord.getValue('entity');
                                soLocation = soRecord.getValue('location');

                                let itemLineData = soRecord.getLineCount({
                                    sublistId: 'item'
                                });

                                for (let i = 0; i < itemLineData; i++) {
                                    soRecord.selectLine({
                                        sublistId: 'item',
                                        line: i
                                    });

                                    let item = soRecord.getCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'item'
                                    });
                                    let quantity = soRecord.getCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'quantity'
                                    });
                                    soItemLineData.push({
                                        item, quantity, line: i
                                    });
                                }

                            } else {
                                throw 'Po not created from so'
                            }

                            let soItemValidationMap = soItemLineData.reduce((acc, line) => {

                                let obj = acc.map[line.item];
                                if (obj) {
                                    acc.dupPresent = true;
                                    acc.dup[line.item].push(line);
                                } else {
                                    acc.map[line.item] = line;
                                    acc.dup[line.item] = [line];
                                }

                                return acc;

                            }, { dup: {}, map: {}, dupPresent: false });

                            //soItemValidationMap.dupSize = Object.keys(soItemValidationMap.dup).length;
                            //create if by sd

                            let shippingLineDetails = getShippingLineDetails(shippingDetailsRecord);

                            if (shippingLineDetails.length > 0) {

                                let groupByItemCode = shippingLineDetails.reduce((acc, e) => {

                                    let obj = acc[e.itemCode];

                                    if (obj) {
                                        obj.quantityShipped += e.quantityShipped;
                                    } else {
                                        acc[e.itemCode] = Object.assign({}, e);
                                    }

                                    return acc;

                                }, {});

                                /* let ifRecord = record.create({
                                    type:record.Type.ITEM_FULFILLMENT,
                                    isDynamic:true
                                }); */

                                log.error('groupByItemCode', { groupByItemCode, soItemValidationMap });

                                let sdItemCodes = Object.keys(groupByItemCode);
                                if (soItemValidationMap.dupPresent) { // this check is for Shipping Detail is duplicate on SO not Vice Versa
                                    let isValid = sdItemCodes.some((item) => {
                                        return soItemValidationMap.dup[item]?.length > 1
                                    });
                                    if (isValid) {
                                        throw `Duplicate Item present on Sales order for the Shipping Detail items`;
                                    }
                                }



                                let shipAndSoItems = populateSDSOValidationData(sdItemCodes, groupByItemCode, soItemValidationMap.map);

                                validateShippingSoDetails(shipAndSoItems);

                                let ifRecord = record.transform({
                                    fromType: record.Type.SALES_ORDER,
                                    fromId: relatedSo,
                                    toType: record.Type.ITEM_FULFILLMENT,
                                    isDynamic: true
                                });

                                /* ifRecord.setValue({
                                    fieldId: 'entity',
                                    value: soCustomer
                                }); */

                                ifRecord.setValue({ fieldId: 'shipstatus', value: 'C' });

                                let ifLineCount = ifRecord.getLineCount({
                                    sublistId: 'item'
                                });

                                for (let i = 0; i < ifLineCount; i++) {
                                    ifRecord.selectLine({
                                        sublistId: 'item',
                                        line: i
                                    });
                                    let ifItem = ifRecord.getCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'item'
                                    });
                                    let itemObj = groupByItemCode[ifItem];
                                    if (itemObj) {
                                        ifRecord.setCurrentSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'quantity',
                                            value: itemObj.quantityShipped
                                        });
                                        ifRecord.setCurrentSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'podoc',
                                            value: relatedPO
                                        });
                                    } else {
                                        ifRecord.setCurrentSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'itemreceive',
                                            value: false
                                        });
                                    }

                                    ifRecord.commitLine({
                                        sublistId: 'item'
                                    });

                                }

                                shippingDetailsRecord.setValue({
                                    fieldId: 'custbody_potr_sh_error_msg',
                                    value: ''
                                });

                                let ifId = ifRecord.save();
                                log.error('ifId', ifId);
                                shippingDetailsRecord.setValue({
                                    fieldId: CST.RECORDS.SHIPPING_DETAILS.FIELDS.RELATED_IF,
                                    value: ifId
                                });

                                shippingDetailsRecord.save();

                                redirectToShippingDetails(shippingDetailsRecord);

                            } else {
                                throw 'Some thing wrong with line item or quantity please check';
                            }

                        }

                    } else {
                        throw `Invalid Request`;
                    }


                } else {
                    throw `Invalid Request`;
                }
            } catch (e) {
                if (shippingDetailsRecord) {
                    shippingDetailsRecord.setValue({
                        fieldId: 'custbody_potr_sh_error_msg',
                        value: e?.message || e
                    });
                    shippingDetailsRecord.save();
                    redirectToShippingDetails(shippingDetailsRecord);
                } else {
                    throw e;
                }

            }


        }

        function redirectToShippingDetails(shippingDetailsRecord) {
            redirect.toRecord({
                type: CST.RECORDS.SHIPPING_DETAILS.ID,
                id: shippingDetailsRecord.id
            });
        }

        function populateSDSOValidationData(sdItemCodes, groupByItemCode, soItemMap) {
            return sdItemCodes.reduce((acc, itemCode) => {
                let sdItem = groupByItemCode[itemCode];
                let soItemData = soItemMap[itemCode];
                if (!!soItemData) {

                    acc.common.push(itemCode);
                    if (sdItem.quantityShipped > soItemData.quantity) {
                        acc.quantityMoreThanSo.push(itemCode);
                    }

                } else {
                    acc.notFound.push(itemCode);
                }
                return acc;
            }, { common: [], notFound: [], quantityMoreThanSo: [] });
        }

        function validateShippingSoDetails(shipAndSoItems) {
            if (shipAndSoItems.notFound.length > 0) {
                throw `Shipping details items : ${shipAndSoItems.notFound.join(',')} is not present in Sales order`;
            } else if (shipAndSoItems.quantityMoreThanSo.length > 0) {
                throw `Shipping details items : ${shipAndSoItems.quantityMoreThanSo.join(',')} quantity is more than Sales order Quantity`;
            }
        }

        function getShippingLineDetails(shippingDetailsRecord) {
            let sdLineCount = shippingDetailsRecord.getLineCount({
                sublistId: CST.RECORDS.SHIPPING_DETAILS.SUBLISTS.LINE.ID
            });

            let lineDetails = [];

            for (let i = 0; i < sdLineCount; i++) {
                shippingDetailsRecord.selectLine({
                    sublistId: CST.RECORDS.SHIPPING_DETAILS.SUBLISTS.LINE.ID,
                    line: i
                });
                let itemCode = shippingDetailsRecord.getCurrentSublistValue({
                    sublistId: CST.RECORDS.SHIPPING_DETAILS.SUBLISTS.LINE.ID,
                    fieldId: CST.RECORDS.SHIPPING_DETAILS.SUBLISTS.LINE.FIELDS.ITEM_CODE
                });
                let quantityShipped = shippingDetailsRecord.getCurrentSublistValue({
                    sublistId: CST.RECORDS.SHIPPING_DETAILS.SUBLISTS.LINE.ID,
                    fieldId: CST.RECORDS.SHIPPING_DETAILS.SUBLISTS.LINE.FIELDS.QUANTITY_SHIPPED
                });
                if (itemCode && quantityShipped) {
                    lineDetails.push({ itemCode, quantityShipped });
                }
            }

            log.error('lineDetails', lineDetails);
            return lineDetails;
        }

        function getRecord(type, id, isthrow) {
            let rec = null;
            try {
                rec = record.load({
                    type, id, isDynamic: true
                });
            } catch (e) {
                log.debug(`Error while loading record type :${type} with id: ${id}`, e);
                if (isthrow) {
                    throw e;
                }

            }
            return rec;
        }

        return { onRequest }

    });
