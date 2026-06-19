const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/Maintenances.tsx', 'utf8');

// 1. RefreshCw
content = content.replace(
  "import { Settings, Wrench, CheckCircle, AlertTriangle, Calendar, Plus, Clock, X, Mail, Edit3, Search, Server } from 'lucide-react';",
  "import { Settings, Wrench, CheckCircle, AlertTriangle, Calendar, Plus, Clock, X, Mail, Edit3, Search, Server, RefreshCw } from 'lucide-react';"
);

// 2. Limpiar Filtros button
const selectEndStr = `                </select>\r
              </div>`;
const buttonHtml = `                </select>\r
                {(filterMonth !== 'all' || filterYear !== 'all' || searchTerm !== '' || filterStatus !== 'all' || viewMode !== 'general') && (\r
                  <button \r
                    className="btn-glass" \r
                    onClick={() => {\r
                      setFilterMonth('all');\r
                      setFilterYear('all');\r
                      setSearchTerm('');\r
                      setFilterStatus('all');\r
                      setViewMode('general');\r
                    }}\r
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}\r
                  >\r
                    <RefreshCw size={16} /> Limpiar Filtros\r
                  </button>\r
                )}\r
              </div>`;
content = content.replace(`                </select>\n              </div>`, buttonHtml.replace(/\r/g, ''));
content = content.replace(`                </select>\r\n              </div>`, buttonHtml);

// 3. Fix date parses
content = content.replace(
  "const years = new Set(maintenances.map(m => new Date(m.scheduledDate).getFullYear()));",
  "const years = new Set(maintenances.map(m => Number(m.scheduledDate.split('T')[0].split('-')[0])));"
);

content = content.replace(
`      const date = new Date(m.scheduledDate);\r
      if (filterYear !== 'all' && date.getFullYear().toString() !== filterYear) return false;\r
      if (filterMonth !== 'all' && (date.getMonth() + 1).toString() !== filterMonth) return false;`,
`      const [y, mStr] = m.scheduledDate.split('T')[0].split('-');\r
      if (filterYear !== 'all' && y !== filterYear) return false;\r
      if (filterMonth !== 'all' && Number(mStr).toString() !== filterMonth) return false;`
);

content = content.replace(
`      const date = new Date(m.scheduledDate);\n      if (filterYear !== 'all' && date.getFullYear().toString() !== filterYear) return false;\n      if (filterMonth !== 'all' && (date.getMonth() + 1).toString() !== filterMonth) return false;`,
`      const [y, mStr] = m.scheduledDate.split('T')[0].split('-');\n      if (filterYear !== 'all' && y !== filterYear) return false;\n      if (filterMonth !== 'all' && Number(mStr).toString() !== filterMonth) return false;`
);

content = content.replace(
`      Preventivo: maintenances?.filter(m => {\r
        const md = new Date(m.scheduledDate);\r
        return m.type === 'PREVENTIVE' && md.getFullYear() === yr && md.getMonth() === mo;\r
      }).length || 0,\r
      Correctivo: maintenances?.filter(m => {\r
        const md = new Date(m.scheduledDate);\r
        return m.type === 'CORRECTIVE' && md.getFullYear() === yr && md.getMonth() === mo;\r
      }).length || 0,`,
`      Preventivo: maintenances?.filter(m => {\r
        const [y, mStr] = m.scheduledDate.split('T')[0].split('-');\r
        return m.type === 'PREVENTIVE' && Number(y) === yr && (Number(mStr) - 1) === mo;\r
      }).length || 0,\r
      Correctivo: maintenances?.filter(m => {\r
        const [y, mStr] = m.scheduledDate.split('T')[0].split('-');\r
        return m.type === 'CORRECTIVE' && Number(y) === yr && (Number(mStr) - 1) === mo;\r
      }).length || 0,`
);
content = content.replace(
`      Preventivo: maintenances?.filter(m => {\n        const md = new Date(m.scheduledDate);\n        return m.type === 'PREVENTIVE' && md.getFullYear() === yr && md.getMonth() === mo;\n      }).length || 0,\n      Correctivo: maintenances?.filter(m => {\n        const md = new Date(m.scheduledDate);\n        return m.type === 'CORRECTIVE' && md.getFullYear() === yr && md.getMonth() === mo;\n      }).length || 0,`,
`      Preventivo: maintenances?.filter(m => {\n        const [y, mStr] = m.scheduledDate.split('T')[0].split('-');\n        return m.type === 'PREVENTIVE' && Number(y) === yr && (Number(mStr) - 1) === mo;\n      }).length || 0,\n      Correctivo: maintenances?.filter(m => {\n        const [y, mStr] = m.scheduledDate.split('T')[0].split('-');\n        return m.type === 'CORRECTIVE' && Number(y) === yr && (Number(mStr) - 1) === mo;\n      }).length || 0,`
);

// 4. min=today constraint
content = content.replace(
  "const now = new Date();",
  "const now = new Date();\n  const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];"
);
content = content.replace(
  '<input required type="date" className="glass-input" value={formData.scheduledDate}',
  '<input required type="date" min={todayStr} className="glass-input" value={formData.scheduledDate}'
);

// 5. Layout swap
const chartsSidebarStart = content.indexOf('        {/* Right Column: Charts Sidebar */}');
if (chartsSidebarStart !== -1) {
    const endStr = "      {/* \u2318\u2318 Modal";
    const endPos = content.indexOf(endStr);
    const endBlockPos = content.lastIndexOf('      </div>', endPos);
    
    if (endBlockPos > chartsSidebarStart) {
        const blockText = content.substring(chartsSidebarStart, endBlockPos);
        content = content.substring(0, chartsSidebarStart) + content.substring(endBlockPos);
        
        // Find insert pos
        const insertTarget = '<div className="table-main-area">';
        const insertPos = content.indexOf(insertTarget);
        if (insertPos !== -1) {
            content = content.substring(0, insertPos) + blockText + '\n        ' + content.substring(insertPos);
        } else {
            console.log('table-main-area not found');
        }
    }
}

// 6. maint-table-scroll
content = content.replace('<div className="table-responsive">', '<div className="table-responsive maint-table-scroll">');

fs.writeFileSync('frontend/src/pages/Maintenances.tsx', content);
console.log('Success');
