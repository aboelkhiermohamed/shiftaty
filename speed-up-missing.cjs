const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.{tsx,ts}');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Pattern: <motion.div initial="..." animate="..."> Without transition
    // We'll use a regex that matches <motion.[tag] ... > but doesn't have transition=
    // To avoid complex regex, we'll split by <motion. and process each chunk

    const chunks = content.split('<motion.');
    for (let i = 1; i < chunks.length; i++) {
        const chunk = chunks[i];
        const endIdx = chunk.indexOf('>');
        if (endIdx > -1) {
            const tagContent = chunk.substring(0, endIdx);
            if (tagContent.includes('animate=') && !tagContent.includes('transition=')) {
                // Insert transition={{ duration: 0.2 }}
                // Find a good place to insert, like right after animate={...}
                // Actually, just append it before the closing >
                // handle self-closing /> or >
                const tagEndStr = tagContent.endsWith('/') ? '/' : '';
                const newTagContent = tagContent.replace(/\/$/, '') + '\n        transition={{ duration: 0.2 }}\n      ' + tagEndStr;
                chunks[i] = newTagContent + chunk.substring(endIdx);
                changed = true;
            }
        }
    }

    if (changed) {
        fs.writeFileSync(file, chunks.join('<motion.'));
        console.log('Updated missing transitions', file);
    }
});
