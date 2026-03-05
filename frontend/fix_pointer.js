const fs = require('fs');
const path = require('path');

function fixDirectory(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            fixDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // Remove the erroneously added className="cursor-pointer" from the <button tags
            // Note: only replacing the exact string '<button className="cursor-pointer"' 
            content = content.split('<button className="cursor-pointer"').join('<button');

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Fixed ${fullPath}`);
            }
        }
    }
}

fixDirectory(path.join(__dirname, 'src'));
