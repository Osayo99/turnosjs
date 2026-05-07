function doPost(e) {
  try {
    var datos = JSON.parse(e.postData.contents);
    var nombreSucursal = datos.sucursal;
    var filas = datos.registros; // Array de datos
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var nombreHoja = nombreSucursal.replace(/[:\/\\?*\[\]]/g, "").substring(0, 30);
    
    var hoja = ss.getSheetByName(nombreHoja);
    
    if (!hoja) {
      hoja = ss.insertSheet(nombreHoja);
      hoja.appendRow(['TICKET', 'TIPO', 'DUI / CLIENTE', 'LLEGADA', 'FIN ATENCIÓN', 'DURACIÓN', 'ATENDIÓ', 'NOTAS', 'DERIVACIÓN']);
      hoja.getRange("A1:I1").setFontWeight("bold").setBackground("#e0e0e0");
    }
    
    if (filas && filas.length > 0) {
      // getRange(fila, col, numFilas, numCols)
      hoja.getRange(hoja.getLastRow() + 1, 1, filas.length, filas[0].length).setValues(filas);
    }
    
    return ContentService
        .createTextOutput(JSON.stringify({status: "success", hojas: nombreHoja}))
        .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService
        .createTextOutput(JSON.stringify({status: "error", msg: error.toString()}))
        .setMimeType(ContentService.MimeType.JSON);
  }
}