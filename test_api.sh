#!/bin/bash
# Test all API endpoints

export NVM_DIR="$HOME/.config/nvm"
source "$NVM_DIR/nvm.sh"

# Start server
node /home/lbonilla/Escritorio/turnosjs/server.js &
SERVER_PID=$!
sleep 3

PASS=0
FAIL=0

test() {
    local desc="$1"
    local expected="$2"
    local result="$3"
    if echo "$result" | grep -q "$expected"; then
        echo "  ✅ $desc"
        ((PASS++))
    else
        echo "  ❌ $desc — esperaba '$expected', obtuvo: $(echo "$result" | head -c 80)"
        ((FAIL++))
    fi
}

# IDs from seed data (extracted at runtime for reproducibility)
eval $(node -e "
const mongoose = require('mongoose');
const Sucursal = require('./src/models/Sucursal');
const Usuario = require('./src/models/Usuario');
(async()=>{
await mongoose.connect('mongodb://127.0.0.1:27017/anda_turnos');
const sucs = await Sucursal.find({}).sort({codigo:1}).lean();
const users = await Usuario.find({}).lean();
const sup = users.find(u=>u.username==='superanda');
const vt = users.find(u=>u.username==='ventanilla1.ssc');
const jf = users.find(u=>u.username==='jefe.ssc');
const sa = sucs.find(s=>s.codigo==='SSC');
const sm = sucs.find(s=>s.codigo==='SA');
console.log('SID='+sa._id);
console.log('SID2='+sm._id);
console.log('VID='+vt._id);
console.log('AID='+sup._id);
console.log('JID='+jf._id);
await mongoose.disconnect();
})();
")

echo "═══════════════════════════════════════"
echo "  1. SUCURSALES (públicas)"
echo "═══════════════════════════════════════"

R=$(curl -s http://localhost:3000/api/sucursales)
test "Listar sucursales" "San Salvador Centro" "$R"

R=$(curl -s http://localhost:3000/api/sucursales/$SID)
test "Obtener sucursal por ID" "SSC" "$R"

R=$(curl -s http://localhost:3000/api/sucursales/$SID/estado-completo)
test "Estado jefatura sin auth" "Acceso denegado" "$R"

echo ""
echo "═══════════════════════════════════════"
echo "  2. LOGIN"
echo "═══════════════════════════════════════"

R=$(curl -s -c /tmp/jar.txt -X POST http://localhost:3000/api/usuarios/login -H 'Content-Type: application/json' -d '{"username":"superanda","password":"123"}')
test "Login super_admin" "super_admin" "$R"

R=$(curl -s -c /tmp/jar_vent.txt -X POST http://localhost:3000/api/usuarios/login -H 'Content-Type: application/json' -d "{\"username\":\"ventanilla1.ssc\",\"password\":\"123\",\"sucursalId\":\"$SID\"}")
test "Login ventanilla con sucursal" "ventanilla" "$R"
# Login jefe for subsequent user management and ticket operations
curl -s -c /tmp/jar2.txt -X POST http://localhost:3000/api/usuarios/login -H 'Content-Type: application/json' -d "{\"username\":\"jefe.ssc\",\"password\":\"123\",\"sucursalId\":\"$SID\"}" > /dev/null

R=$(curl -s -X POST http://localhost:3000/api/usuarios/login -H 'Content-Type: application/json' -d '{"username":"ventanilla1.ssc","password":"123"}')
test "Login ventanilla SIN sucursal (debe fallar)" "no existe" "$R"

R=$(curl -s -X POST http://localhost:3000/api/usuarios/login -H 'Content-Type: application/json' -d '{"username":"superanda","password":"wrong"}')
test "Login password incorrecto" "Contraseña incorrecta" "$R"

R=$(curl -s -b /tmp/jar.txt -X POST http://localhost:3000/api/usuarios/logout)
test "Logout" "Sesión cerrada" "$R"

# Re-login admin for subsequent tests
curl -s -c /tmp/jar.txt -X POST http://localhost:3000/api/usuarios/login -H 'Content-Type: application/json' -d '{"username":"superanda","password":"123"}' > /dev/null

echo ""
echo "═══════════════════════════════════════"
echo "  3. SUCURSALES (autenticadas)"
echo "═══════════════════════════════════════"

R=$(curl -s -b /tmp/jar.txt -X POST http://localhost:3000/api/sucursales -H 'Content-Type: application/json' -d '{"nombre":"Sucursal Test","codigo":"TST","direccion":"Dir test"}')
test "Crear sucursal con auth" "TST" "$R"
SID_NEW=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['_id'])" 2>/dev/null)

R=$(curl -s -X POST http://localhost:3000/api/sucursales -H 'Content-Type: application/json' -d '{"nombre":"Maligna","codigo":"MAL"}')
test "Crear sucursal sin auth" "Acceso denegado" "$R"

R=$(curl -s -b /tmp/jar.txt -X PUT http://localhost:3000/api/sucursales/$SID_NEW -H 'Content-Type: application/json' -d '{"nombre":"Sucursal Test Editada"}')
test "Editar sucursal con auth" "success" "$R"

R=$(curl -s -X PUT http://localhost:3000/api/sucursales/$SID_NEW -H 'Content-Type: application/json' -d '{"nombre":"Hackeada"}')
test "Editar sucursal sin auth" "Acceso denegado" "$R"

R=$(curl -s -b /tmp/jar.txt -X DELETE http://localhost:3000/api/sucursales/$SID_NEW)
test "Eliminar sucursal con auth" "success" "$R"

R=$(curl -s -X DELETE http://localhost:3000/api/sucursales/$SID_NEW)
test "Eliminar sucursal sin auth" "Acceso denegado" "$R"

R=$(curl -s -b /tmp/jar.txt http://localhost:3000/api/sucursales/$SID/estado-completo)
test "Estado jefatura con auth" "stats" "$R"

echo ""
echo "═══════════════════════════════════════"
echo "  4. USUARIOS (CRUD)"
echo "═══════════════════════════════════════"

R=$(curl -s -b /tmp/jar.txt http://localhost:3000/api/usuarios/sucursal/$SID)
test "Listar usuarios por sucursal" "ventanilla" "$R"

TIMESTAMP=$(date +%s)
R=$(curl -s -b /tmp/jar2.txt -X POST http://localhost:3000/api/usuarios/crear -H 'Content-Type: application/json' -d "{\"codigoEmpleado\":\"$(printf '%05d' $((TIMESTAMP % 100000)))\",\"nombre\":\"Nuevo Ejecutivo\",\"username\":\"nuevo.eje.$TIMESTAMP\",\"password\":\"123\",\"sucursalId\":\"$SID\",\"rol\":\"ejecutivo\",\"numeroVentanilla\":4,\"skills\":[{\"tipo\":\"PAGOS\",\"prioridad\":1}]}")
test "Crear usuario por jefe" "success" "$R"
U_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['_id'])" 2>/dev/null)

R=$(curl -s -b /tmp/jar.txt -X POST http://localhost:3000/api/admin/crear-usuario -H 'Content-Type: application/json' -d "{\"codigoEmpleado\":\"$(printf '%05d' $(((TIMESTAMP + 1) % 100000)))\",\"nombre\":\"Jefe Test\",\"username\":\"jefe.test\",\"password\":\"123\",\"sucursalId\":\"$SID\",\"rol\":\"jefe_sucursal\"}")
test "Crear jefe por admin" "success" "$R"

R=$(curl -s -b /tmp/jar.txt -X PUT http://localhost:3000/api/usuarios/actualizar -H 'Content-Type: application/json' -d "{\"id\":\"$U_ID\",\"nombre\":\"Ejecutivo Renombrado\",\"username\":\"nuevo.eje\",\"skills\":[{\"tipo\":\"PAGOS\",\"prioridad\":1}],\"numeroVentanilla\":4}")
test "PUT actualizar usuario" "success" "$R"

R=$(curl -s -b /tmp/jar.txt -X PUT http://localhost:3000/api/usuarios/admin-reset-password -H 'Content-Type: application/json' -d "{\"targetUserId\":\"$U_ID\",\"nuevaPassword\":\"456\"}")
test "PUT reset password" "success" "$R"

R=$(curl -s -b /tmp/jar.txt -X DELETE http://localhost:3000/api/usuarios/$U_ID)
test "DELETE eliminar usuario" "success" "$R"

R=$(curl -s -b /tmp/jar.txt -X POST http://localhost:3000/api/usuarios/cambiar-password -H 'Content-Type: application/json' -d "{\"usuarioId\":\"$AID\",\"actual\":\"123\",\"nueva\":\"1234\"}")
test "POST cambiar password propio" "success" "$R"
curl -s -b /tmp/jar.txt -X PUT http://localhost:3000/api/usuarios/admin-reset-password -H 'Content-Type: application/json' -d "{\"targetUserId\":\"$AID\",\"nuevaPassword\":\"123\"}" > /dev/null

echo ""
echo "═══════════════════════════════════════"
echo "  5. TICKETS"
echo "═══════════════════════════════════════"

R=$(curl -s -X POST http://localhost:3000/api/tickets/crear -H 'Content-Type: application/json' -d "{\"sucursalId\":\"$SID\",\"tipoTramite\":\"PAGOS\",\"documento\":\"DNI999\"}")
test "Crear ticket público" "G-" "$R"

R=$(curl -s -X POST http://localhost:3000/api/tickets/crear -H 'Content-Type: application/json' -d "{\"sucursalId\":\"$SID\",\"tipoTramite\":\"RECLAMOS\",\"documento\":\"DNI888\",\"condiciones\":[\"Prioridad\",\"Silla de ruedas\"]}")
test "Crear ticket prioritario" "Prioridad" "$R"

R=$(curl -s -X POST http://localhost:3000/api/tickets/crear -H 'Content-Type: application/json' -d "{\"sucursalId\":\"$SID2\",\"tipoTramite\":\"CONSULTAS\"}")
test "Crear ticket CONSULTAS en SA" "C-" "$R"

R=$(curl -s http://localhost:3000/api/tickets/cola/$SID)
test "Obtener cola" "pendiente" "$R"

R=$(curl -s -b /tmp/jar2.txt -X POST http://localhost:3000/api/tickets/llamar -H 'Content-Type: application/json' -d "{\"usuarioId\":\"$VID\",\"sucursalId\":\"$SID\",\"ventanilla\":1}")
test "Llamar siguiente ticket" "success" "$R"

R=$(curl -s -b /tmp/jar2.txt -X POST http://localhost:3000/api/tickets/volver-llamar -H 'Content-Type: application/json' -d "{\"sucursalId\":\"$SID\",\"usuarioId\":\"$VID\"}")
test "Volver a llamar" "success" "$R"

R=$(curl -s -b /tmp/jar2.txt http://localhost:3000/api/tickets/activo/$VID)
test "Obtener ticket activo" "ticket" "$R"

TICKET_ACTIVO=$(curl -s -b /tmp/jar2.txt http://localhost:3000/api/tickets/activo/$VID | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('ticket',{}).get('_id',''))" 2>/dev/null)
if [ -n "$TICKET_ACTIVO" ]; then
  R=$(curl -s -b /tmp/jar2.txt -X POST http://localhost:3000/api/tickets/finalizar -H 'Content-Type: application/json' -d "{\"ticketId\":\"$TICKET_ACTIVO\",\"notas\":\"Atendido correctamente\",\"tiempoTotal\":300}")
  test "Finalizar ticket" "success" "$R"
fi

# Derivar workflow
R=$(curl -s -X POST http://localhost:3000/api/tickets/crear -H 'Content-Type: application/json' -d "{\"sucursalId\":\"$SID\",\"tipoTramite\":\"RECLAMOS\"}")
TID_DERIV=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['ticket']['_id'])" 2>/dev/null)

R=$(curl -s -b /tmp/jar2.txt -X POST http://localhost:3000/api/tickets/llamar -H 'Content-Type: application/json' -d "{\"usuarioId\":\"$VID\",\"sucursalId\":\"$SID\",\"ventanilla\":1}")
TID_LLAMADO=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('ticket',{}).get('_id',''))" 2>/dev/null)

R=$(curl -s -b /tmp/jar2.txt -X POST http://localhost:3000/api/tickets/derivar -H 'Content-Type: application/json' -d "{\"ticketId\":\"$TID_LLAMADO\",\"motivo\":\"Requiere autorizacion\",\"usuarioId\":\"$VID\"}")
test "Derivar ticket" "success" "$R"

# Login jefe
curl -s -c /tmp/jar3.txt -X POST http://localhost:3000/api/usuarios/login -H 'Content-Type: application/json' -d "{\"username\":\"jefe.ssc\",\"password\":\"123\",\"sucursalId\":\"$SID\"}" > /dev/null
R=$(curl -s -b /tmp/jar3.txt -X POST http://localhost:3000/api/tickets/atender-derivado -H 'Content-Type: application/json' -d "{\"ticketId\":\"$TID_LLAMADO\",\"usuarioId\":\"$JID\"}")
test "Atender derivado como jefe" "success" "$R"

R=$(curl -s -b /tmp/jar3.txt http://localhost:3000/api/tickets/jefatura/$SID)
test "Info jefatura" "stats" "$R"

R=$(curl -s -b /tmp/jar3.txt "http://localhost:3000/api/tickets/historial/$SID?fechaInicio=2026-01-01&fechaFin=2026-12-31")
test "Buscar historial" "codigo" "$R"

R=$(curl -s -b /tmp/jar.txt -X POST http://localhost:3000/api/tickets/llamar -H 'Content-Type: application/json' -d "{\"usuarioId\":\"$AID\",\"sucursalId\":\"$SID\",\"ventanilla\":1}")
test "Llamar sin skills (debe fallar)" "habilidades" "$R"

echo ""
echo "═══════════════════════════════════════"
echo "  6. GUÍAS"
echo "═══════════════════════════════════════"

R=$(curl -s http://localhost:3000/api/guias)
test "Listar guías público" "Guía" "$R"

R=$(curl -s -b /tmp/jar.txt -X POST http://localhost:3000/api/guias -H 'Content-Type: application/json' -d '{"titulo":"Guía de prueba","contenido":"Contenido de prueba"}')
test "Crear guía con auth" "success" "$R"
GID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['guia']['_id'])" 2>/dev/null)

R=$(curl -s -X POST http://localhost:3000/api/guias -H 'Content-Type: application/json' -d '{"titulo":"Guía maliciosa","contenido":"x"}')
test "Crear guía sin auth" "Acceso denegado" "$R"

R=$(curl -s -b /tmp/jar.txt -X PUT http://localhost:3000/api/guias/$GID -H 'Content-Type: application/json' -d '{"titulo":"Editada","contenido":"Editado"}')
test "Editar guía" "success" "$R"

R=$(curl -s -b /tmp/jar.txt -X DELETE http://localhost:3000/api/guias/$GID)
test "Eliminar guía" "success" "$R"

echo ""
echo "═══════════════════════════════════════"
echo "  7. ADMIN"
echo "═══════════════════════════════════════"

R=$(curl -s -b /tmp/jar.txt http://localhost:3000/api/admin/global-data)
test "Global data" "sucursales" "$R"

R=$(curl -s -b /tmp/jar.txt "http://localhost:3000/api/admin/sucursal/$SID?fechaInicio=2026-01-01&fechaFin=2026-12-31")
test "Detalles sucursal" "stats" "$R"

USERS_JSON=$(curl -s -b /tmp/jar.txt http://localhost:3000/api/usuarios/sucursal/$SID)
UEDIT=$(echo "$USERS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['_id'])" 2>/dev/null)
UNAME=$(echo "$USERS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['username'])" 2>/dev/null)
R=$(curl -s -b /tmp/jar.txt -X PUT http://localhost:3000/api/admin/editar-usuario -H 'Content-Type: application/json' -d "{\"id\":\"$UEDIT\",\"codigoEmpleado\":\"$(printf '%05d' $(((TIMESTAMP + 2) % 100000)))\",\"nombre\":\"Editado por admin\",\"username\":\"$UNAME\",\"rol\":\"ventanilla\",\"sucursalId\":\"$SID\"}")
test "Editar usuario por admin" "success" "$R"

R=$(curl -s -b /tmp/jar.txt -X POST http://localhost:3000/api/admin/config-export -H 'Content-Type: application/json' -d "{\"sucursalId\":\"$SID\",\"sheetId\":\"http://maligno.com/robo\",\"frecuencia\":\"1h\"}")
test "Config export URL inválida" "Google Apps Script" "$R"

R=$(curl -s -b /tmp/jar.txt -X POST http://localhost:3000/api/admin/config-export -H 'Content-Type: application/json' -d "{\"sucursalId\":\"$SID\",\"sheetId\":\"https://script.google.com/macros/s/xyz/exec\",\"frecuencia\":\"1h\"}")
test "Config export URL válida" "success" "$R"

R=$(curl -s http://localhost:3000/api/admin/global-data)
test "Admin sin auth (debe fallar)" "Acceso denegado" "$R"

R=$(curl -s -b /tmp/jar.txt -X DELETE http://localhost:3000/api/admin/eliminar-usuario/$UEDIT)
test "DELETE admin eliminar usuario" "success" "$R"

echo ""
echo "═══════════════════════════════════════"
echo "  8. RATE LIMITING"
echo "═══════════════════════════════════════"

for i in $(seq 1 12); do
  curl -s -X POST http://localhost:3000/api/tickets/crear -H 'Content-Type: application/json' -d "{\"sucursalId\":\"$SID\",\"tipoTramite\":\"PAGOS\"}" > /dev/null 2>&1
done
R=$(curl -s -X POST http://localhost:3000/api/tickets/crear -H 'Content-Type: application/json' -d "{\"sucursalId\":\"$SID\",\"tipoTramite\":\"PAGOS\"}")
test "Rate limit superado" "Demasiadas" "$R"

echo ""
echo "═══════════════════════════════════════"
echo ""
echo "  ✅ Pasaron: $PASS"
echo "  ❌ Fallaron: $FAIL"
echo "  Total: $((PASS+FAIL))"

kill $SERVER_PID 2>/dev/null
exit $FAIL
