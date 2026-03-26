const fs = require('fs');
const path = require('path');
const file = path.resolve('e:/app/store ligera app web/store ligera/client/src/pages/Dashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

const s1 = `        if (view === 'finalizar') {
            return (
                <div style={{ textAlign: 'center' }}>
                    <button onClick={() => setView('menu')} style={{ marginBottom: '10px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>&lt; Volver</button>
                    <h3 style={{ color: '#28a745' }}>Jornada Finalizada</h3>
                    <p style={{ color: '#555', marginBottom: '20px' }}>Escanea este código con tu celular para recuperar los datos.</p>
                    <div style={{ background: 'white', padding: '15px', display: 'inline-block', borderRadius: '10px', border: '1px solid #ccc' }}>
                        <QRCodeSVG value={JSON.stringify({ ip, port: "3000", status: "download_ready" })} size={200} />
                    </div>
                    <p style={{ marginTop: '20px' }}>
                        <a href="/api/system/sync-download" download="empresa.db" style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}>
                            O descargar archivo manualmente
                        </a>
                    </p>
                </div>
            );
        }`;

const r1 = `        if (view === 'finalizar') {
            const sid = localStorage.getItem('sawa_session_id');
            return (
                <div style={{ textAlign: 'center' }}>
                    <button onClick={() => setView('menu')} style={{ marginBottom: '10px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>&lt; Volver</button>
                    <h3 style={{ color: '#28a745' }}>Jornada Finalizada</h3>
                    <p style={{ color: '#555', marginBottom: '20px' }}>Escanea este código con tu celular para recuperar los datos a través de esta sesión <b>{sid?.substring(0,8)}</b>.</p>
                    <div style={{ background: 'white', padding: '15px', display: 'inline-block', borderRadius: '10px', border: '1px solid #ccc' }}>
                        <QRCodeSVG value={JSON.stringify({ ip, port: window.location.port || "3000", status: "download_ready", session_id: sid })} size={200} />
                    </div>
                    <p style={{ marginTop: '20px' }}>
                        <a href={\`/api/system/sync-download?session_id=\${sid}\`} download="empresa.db" onClick={() => {
                            setTimeout(() => {
                                localStorage.removeItem('sawa_session_id');
                                window.location.href = '/';
                            }, 5000);
                        }} style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}>
                            O descargar archivo y CERRAR SESIÓN web
                        </a>
                    </p>
                </div>
            );
        }`;

content = content.replace(s1, r1);
fs.writeFileSync(file, content, 'utf8');
