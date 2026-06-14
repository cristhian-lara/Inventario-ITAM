const fs = require('fs');
const file = 'frontend/src/pages/Catalog.tsx';
let c = fs.readFileSync(file, 'utf8');

// Fix Category
c = c.replace(/<Tag size=\{12\} \/> \{asset\.categoryId\}/, `<Tag size={12} /> {categories?.find((c: any) => c.id === Number(asset.categoryId))?.name || asset.categoryId}`);

// Fix Serial/Email cell
// It's currently: <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{asset.serial}</td>
const emailCell = `<td style={{ color: 'var(--text-muted)' }}>
                    {(() => {
                      const activeAssignment = getActiveAssignmentForAsset(asset.id);
                      if (activeAssignment && activeAssignment.collaboratorId) {
                        const coll = collaborators?.find(c => c.id === activeAssignment.collaboratorId);
                        return coll ? (
                          <Link to={\`/collaborators/\${activeAssignment.collaboratorId}\`} style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: '500' }}>
                            {coll.email}
                          </Link>
                        ) : 'Sin asignar';
                      }
                      return 'Sin asignar';
                    })()}
                  </td>`;

c = c.replace(/<td style=\{\{ fontFamily: 'monospace', color: 'var\(--text-muted\)' \}\}>\{asset\.serial\}<\/td>/, emailCell);

// Add Serial into specs
c = c.replace(/<td className="specs-cell">\s*\{Object\.entries\(asset\.dynamicAttributes/m, `<td className="specs-cell">
                    <span className="spec-tag" title="Serial">
                      <HardDrive size={12} /> {asset.serial || 'N/A'}
                    </span>
                    {Object.entries(asset.dynamicAttributes`);

fs.writeFileSync(file, c);
console.log('Fixed');
