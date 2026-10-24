const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.{tsx,ts}');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Pattern 1: transition={{ delay: 0.1 }} => transition={{ delay: 0.05, duration: 0.2 }}
    let newContent = content.replace(/transition=\{\{\s*delay:\s*([0-9.]+)\s*\}\}/g, (match, p1) => {
        changed = true;
        const oldDelay = parseFloat(p1);
        const newDelay = (oldDelay * 0.5).toFixed(3).replace(/\.?0+$/, '');
        return `transition={{ delay: ${newDelay}, duration: 0.2 }}`;
    });

    // Pattern 2: transition={{ delay: index * 0.05 }} => transition={{ delay: index * 0.025, duration: 0.2 }}
    newContent = newContent.replace(/transition=\{\{\s*delay:\s*index\s*\*\s*([0-9.]+)\s*\}\}/g, (match, p1) => {
        changed = true;
        const oldFactor = parseFloat(p1);
        const newFactor = (oldFactor * 0.5).toFixed(3).replace(/\.?0+$/, '');
        return `transition={{ delay: index * ${newFactor}, duration: 0.2 }}`;
    });

    // Pattern 3: transition={{ delay, duration: 0.3 }} => transition={{ delay, duration: 0.15 }}
    newContent = newContent.replace(/transition=\{\{\s*delay,\s*duration:\s*0\.3\s*\}\}/g, () => {
        changed = true;
        return `transition={{ delay, duration: 0.15 }}`;
    });

    if (changed) {
        fs.writeFileSync(file, newContent);
        console.log('Updated', file);
    }
});
