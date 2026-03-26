const fs = require('fs');
const path = require('path');
const file = path.resolve('e:/app/store ligera app web/store ligera/client/src/pages/Dashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

const searchStr = `<button onClick={() => setView('theme')} className="btn-primary" style={{ background: '#ddd', color: '#333' }}>`;
const replaceStr = `<button onClick={() => setView('finalizar')} className="btn-primary" style={{ background: '#28a745', color: 'white', fontWeight: 'bold' }}>
                        <Save size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                        Finalizar Jornada (Exportar)
                    </button>
                    <button onClick={() => setView('theme')} className="btn-primary" style={{ background: '#ddd', color: '#333' }}>`;

if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Replaced successfully");
} else {
    console.log("Search string not found");
}
