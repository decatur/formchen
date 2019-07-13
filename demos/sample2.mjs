export let schema = {
    definitions: {
        "refSchema": {
            title: 'Measurements',
            type: 'object',
            items: {
                type: 'object',
                items: [  // tuple schema
                    {title: 'TimeStamp', width: 200, type: 'string', format: 'datetime'},
                    {title: 'Age [d]', width: 100, type: 'number'},
                    {title: 'Weight [g]', width: 100, type: 'number'}
                ]
            }
        }
    },

    title: 'FieldObservation',
    type: 'object',
    properties: {
        someString: {
            title: 'Some String',
            type: 'string'
        },
        someURI: {
            title: 'Some URI',
            type: 'string',
            format: 'uri'
        },
        someEnum: {
            title: 'Some Enum',
            type: 'string',
            enum: ['Frida Krum', 'Tilda Swift']
        },
        someDate: {
            title: 'Some Date',
            type: 'string',
            format: 'date'
        },
        someDateTime: {
            title: 'Some DateTime',
            type: 'string',
            format: 'datetime'
        },
        someDateTimeLocal: {
            title: 'Some DateTimeLocal',
            type: 'string',
            format: 'datetimelocal'
        },
        someBoolean: {
            title: 'Some Boolean',
            type: 'boolean'
        },
        someInteger: {
            title: 'Some Integer',
            type: 'integer'
        },
        someFloat: {
            title: 'Some Float',
            type: 'number',
            unit: '[DD]',
            fractionDigits: 2
        },
        somePercentValue: {
            title: 'Some Percent Value',
            type: 'number',
            unit: '[%]',
            fractionDigits: 1
        },
        unresolvedRef: {
            title: 'A Unresolvable Reference',
            $ref: '#/definitions/foobar'
        },
        someMatrix: {
            title: 'Some Matrix',
            $ref: '#/definitions/refSchema'
        },
        anObject: {
            title: 'An Object',
            type: 'object',
            properties: {
                someOtherString: {
                    type: 'string'
                }
            }
        },
        anEmptyMatrix: {
            title: 'An Undefined Matrix',
            $ref: '#/definitions/refSchema'
        },
        invalidSchema: {
            title: 'Invalid Schema',
            type: 'Date'
        }
    }
};

export let data = {
    someString: 'Rubus idaeus',
    someURI: 'https://en.wikipedia.org/wiki/Rubus_idaeus',
    someEnum: 'Frida Krum',
    someDate: '2019-01-01',
    someDateTime: '2019-01-01T00:00Z',
    someDateTimeLocal: '2019-01-01T00:00',
    somePercentValue: 0.5,
    someBoolean: true,
    someInteger: 7,
    someFloat: 3.14,
    someMatrix: [
        [new Date(2019, 2, 1), 0, 0],
        [new Date(2019, 2, 2), 1, 2],
        [new Date(2019, 2, 3), 2, 4]
    ],
    invalidSchema: new Date()
};
