const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/Maintenances.tsx', 'utf8');

const chartsSidebarStart = content.indexOf('        {/* Right Column: Charts Sidebar */}');
if (chartsSidebarStart !== -1) {
    const chartsSidebarEnd = content.indexOf('      </div>\r\n\r\n      {/* \u2318\u2318 Modal', chartsSidebarStart); // Let's just find the closing tags safely.
    
    // Alternative finding logic
    const strToFind = "        {/* Right Column: Charts Sidebar */}";
    const endStr = "      {/* \u2318\u2318 Modal";
    const endPos = content.indexOf(endStr);
    // Find the last </div></div> before the modal
    const endBlockPos = content.lastIndexOf('      </div>', endPos);
    
    const blockText = content.substring(chartsSidebarStart, endBlockPos);
    content = content.substring(0, chartsSidebarStart) + content.substring(endBlockPos);
    
    const insertTarget = '        {/* Left Column: Table & Filters */}';
    const insertPos = content.indexOf(insertTarget);
    
    content = content.substring(0, insertPos) + blockText + '\n' + content.substring(insertPos);
    content = content.replace('<div className="table-responsive">', '<div className="table-responsive maint-table-scroll">');
    fs.writeFileSync('frontend/src/pages/Maintenances.tsx', content);
    console.log('Success');
} else {
    console.log('Not found');
}
