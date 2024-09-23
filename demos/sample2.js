export let schema = {
    definitions: {
        "refSchema": {
            title: 'Measurements',
            type: 'array',
            format: 'grid',
            items: {
                type: 'array',
                items: [  // tuple schema
                    {title: 'TimeStamp', width: 200, type: 'string', format: 'date-time'},
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
            enum: ['Frida Krum', 'Tilda Swift', 'Mona Lisa']
        },
        someDate: {
            title: 'Some Date',
            type: 'string',
            format: 'full-date'
        },
        someDateTime: {
            title: 'Some DateTime',
            type: 'string',
            format: 'date-time'
        },
        someDatePartialTime: {
            title: 'Some DatePartialTime',
            type: 'string',
            format: 'date-partial-time'
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
            type: 'number', format: '%',
            unit: '[%]',
            fractionDigits: 1
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
        }
    }
};

export let data = {
    someString: 'Rubus idaeus',
    someURI: 'https://en.wikipedia.org/wiki/Rubus_idaeus',
    someEnum: 'Mona Lisa',
    someDate: '2019-01-01',
    someDateTime: '2019-01-01T00:00Z',
    someDatePartialTime: '2019-01-01T00:00',
    someBoolean: true,
    someInteger: 7,
    someFloat: 3.14,
    somePercentValue: 0.5,
    someMatrix: [
        ['2019-01-01 00:00Z', 1, 2],
        ['2019-01-01 00:00Z', 3, 4],
        ['2019-01-01 00:00Z', 4, 5]
    ]
};
