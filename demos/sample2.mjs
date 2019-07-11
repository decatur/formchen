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
        aDateTime: {
            title: 'A DateTime',
            type: 'string',
            format: 'datetime'
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
            $ref: '#/definitions/foobar'
        },
        aMatrix: {
            $ref: '#/definitions/refSchema'
        },
        anEmptyMatrix: {
            $ref: '#/definitions/refSchema'
        }
    }
};

export let data = {
    plant: 'Rubus idaeus',
    reference: 'https://en.wikipedia.org/wiki/Rubus_idaeus',
    observer: 'Frida Krum',
    start: '2019-01-01T00:00Z',
    latitude: 41.40338,
    longitude: 2.17403,
    aMatrix: [
        [new Date(2019, 2, 1), 0, 0],
        [new Date(2019, 2, 2), 1, 2],
        [new Date(2019, 2, 3), 2, 4]
    ]
};
