(function () {
    'use strict';

    const self = RESTer.register('variables', ['eventListeners']);
    const RE_VARS = /\{(\S+?)\}/gi;

    self.providedValues = {};

    collectProvidedValues();
    initVarProviderChangeListeners();

    function collectProvidedValues() {
        self.providedValues = {};
        for (let name in self.providers) {
            if (self.providers.hasOwnProperty(name)) {
                const provider = self.providers[name];
                for (let key in provider.values) {
                    if (provider.values.hasOwnProperty(key)) {
                        self.providedValues[`$${name}.${key}`] = provider.values[key];
                    }
                }
            }
        }

        self.fireEvent('providedValuesChanged', self.providedValues);
    }

    function initVarProviderChangeListeners() {
        for (let name in self.providers) {
            if (self.providers.hasOwnProperty(name)) {
                const provider = self.providers[name];
                provider.addEventListener('valuesChanged', collectProvidedValues);
            }
        }
    }

    self.extract = function (obj) {
        const vars = new Set();

        if (typeof obj === 'string') {
            const matches = obj.match(RE_VARS);
            if (matches) {
                matches
                    .map(m => m.substr(1, m.length - 2))
                    .forEach(v => vars.push(v));
            }
        } else if (typeof obj === 'object' && obj !== null) {
            Object.keys(obj).forEach(key => {
                self.extract(obj[key]).forEach(v => vars.push(v));
            });
        }

        return Array.from(vars);
    };

    function replaceInternal(obj, allValues, usedValues) {
        if (typeof obj === 'string') {
            obj = obj.replace(RE_VARS, match => {
                let varName = match.substr(1, match.length - 2),
                    value = allValues[varName];

                if (typeof value !== 'undefined') {
                    usedValues[varName] = value;
                    return value;
                } else {
                    return `{${varName}}`;
                }
            });
        } else if (typeof obj === 'object' && obj !== null) {
            obj = RESTer.util.clone(obj);
            Object.keys(obj).forEach(key => {
                obj[key] = replaceInternal(obj[key], allValues, usedValues);
            });
        }

        return obj;
    }

    self.replace = function (obj, values = {}, usedValues = {}) {
        return replaceInternal(obj, Object.assign({}, values, self.providedValues), usedValues);
    };

    self.replaceWithoutProvidedValues = function (obj, values = {}, usedValues = {}) {
        return replaceInternal(obj, Object.assign({}, values), usedValues);
    };
})();
