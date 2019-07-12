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
        aString: {
            title: 'A String',
            type: 'string'
        },
        aURI: {
            title: 'a URI',
            type: 'string',
            format: 'uri'
        },
        anEnum: {
            title: 'An Enum',
            type: 'string',
            enum: ['Frida Krum', 'Tilda Swift']
        },
        aDate: {
            title: 'A Date',
            type: 'string',
            format: 'date'
        },
        aDateTime: {
            title: 'A DateTime',
            type: 'string',
            format: 'datetime'
        },
        aDateTimeLocal: {
            title: 'A DateTimeLocal',
            type: 'string',
            format: 'datetimelocal'
        },
        aBoolean: {
            title: 'A Boolean',
            type: 'boolean'
        },
        aInteger: {
            title: 'A Integer',
            type: 'integer'
        },
        aFloat: {
            title: 'A Float',
            type: 'number',
            unit: '[DD]',
            fractionDigits: 2
        },
        aPercentValue: {
            title: 'A Percent Value',
            type: 'number',
            unit: '[%]',
            fractionDigits: 1
        },
        unresolvedRef: {
            title: 'A Unresolvable Reference',
            $ref: '#/definitions/foobar'
        },
        aMatrix: {
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
        }
    }
};

export let data = {
    aString: 'Rubus idaeus',
    aURI: 'https://en.wikipedia.org/wiki/Rubus_idaeus',
    anEnum: 'Frida Krum',
    aDate: '2019-01-01',
    aDateTime: '2019-01-01T00:00Z',
    aDateTimeLocal: '2019-01-01T00:00',
    aPercentValue: 0.5,
    aBoolean: true,
    aInteger: 7,
    aFloat: 3.14,
    aMatrix: [
        [new Date(2019, 2, 1), 0, 0],
        [new Date(2019, 2, 2), 1, 2],
        [new Date(2019, 2, 3), 2, 4]
    ]
};
