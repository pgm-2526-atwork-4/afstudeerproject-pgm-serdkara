const fs = require('fs');
const path = require('path');

function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = false;

            // Replace <button> tags
            content = content.replace(/<button\b[^>]*>/g, (match) => {
                if (!match.includes('cursor-pointer')) {
                    if (match.includes('className="')) {
                        return match.replace(/className="([^"]*)"/, 'className="$1 cursor-pointer"');
                    } else if (match.includes("className={'")) {
                        return match.replace(/className=\{'([^']*)'\}/, "className={'$1 cursor-pointer'}");
                    } else if (match.includes('className={`')) {
                        return match.replace(/className=\{`([^`]*)`\}/, "className={`$1 cursor-pointer`}");
                    } else {
                        return match.replace('<button', '<button className="cursor-pointer"');
                    }
                }
                return match;
            });

            // Also add cursor-pointer to the known 'Browse Files' div and others if matching
            content = content.replace(/<div[^>]*Browse Files[^<]*<\/div>/g, (match) => {
                // Actually, the 'Browse Files' text is inside the div, my regex on <div ...> won't work well
                return match;
            });

            if (content !== fs.readFileSync(fullPath, 'utf8')) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDirectory(path.join(__dirname, 'src'));
