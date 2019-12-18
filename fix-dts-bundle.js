const fs = require('fs');

function main(prefix, inputFile, outputFile = inputFile) {
    fs.readFile(inputFile, 'utf-8', function (err, text) {
        if (err)
            throw err;

        const changes = new Map();

        text = text.replace(/declare module ["'](.*?)["']/g, (str, name) => {
            const orignal = name;
            name = '/' + name;
            name = name.replace(/\/index$/, '');
            name = prefix + name;
            changes.set(orignal, name);
            return `declare module "${name}"`;
        });

        text = text.replace(/(?<!declare )module ["'](.*?)["']/g, (str, name) => {
            let newName = changes.get(name);
            if (newName === undefined)
                newName = changes.get(name + '/index');
            if (newName === undefined)
                return str;
            return `module "${newName}"`;
        });

        text = text.replace(/((?:import|export) .*? from) ["'](.*?)["']/g, (str, statement, name) => {
            let newName = changes.get(name);
            if (newName === undefined)
                newName = changes.get(name + '/index');
            if (newName === undefined)
                return str;
            return `${statement} "${newName}"`;
        });

        text = text.replace(/import\(["'](.*?)["']\)/g, (str, name) => {
            let newName = changes.get(name);
            if (newName === undefined)
                newName = changes.get(name + '/index');
            if (newName === undefined)
                return str;
            return `import("${newName}")`;
        });

        fs.writeFile(outputFile, text, 'utf-8', function (err) {
            if (err)
                throw err;
        });
    });
}

main(...process.argv.slice(2));
