function doPost(e) {
  try {
    var datos = JSON.parse(e.postData.contents);
    var nombreSucursal = datos.sucursal;
    var filas = datos.registros;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var nombreHoja = nombreSucursal.replace(/[:\/\\?*\[\]]/g, "").substring(0, 30);
    var hoja = ss.getSheetByName(nombreHoja);
    var HEADERS = ['TICKET', 'TIPO', 'DUI / CLIENTE', 'LLEGADA', 'FIN ATENCIÓN', 'DURACIÓN', 'ATENDIÓ', 'CÓDIGO EMPLEADO', 'NOTAS', 'DERIVACIÓN'];
    if (!hoja) {
      hoja = ss.insertSheet(nombreHoja);
      hoja.appendRow(HEADERS);
      hoja.getRange("A1:J1").setFontWeight("bold").setBackground("#e0e0e0");
    } else {
      var existingHeaders = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
      for (var i = 0; i < HEADERS.length; i++) {
        if (!existingHeaders[i] || existingHeaders[i] !== HEADERS[i]) {
          hoja.getRange(1, i + 1).setValue(HEADERS[i]);
        }
      }
      hoja.getRange("A1:J1").setFontWeight("bold").setBackground("#e0e0e0");
    }
    if (filas && filas.length > 0) {
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

