export let schema = {
    definitions: {
        "measurements": {
            title: 'Measurements',
            type: 'array',
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
        plant: {
            title: 'Plant',
            type: 'string'
        },
        reference: {
            title: 'Reference',
            type: 'string',
            format: 'uri'
        },
        observer: {
            title: 'Observer',
            type: 'string',
            enum: ['Frida Krum', 'Tilda Swift']
        },
        start: {
            title: 'Started',
            type: 'string',
            format: 'date-time'
        },
        latitude: {
            title: 'Latitude',
            type: 'number',
            unit: '[DD]',
            fractionDigits: 5
        },
        longitude: {
            title: 'Longitude',
            type: 'number',
            unit: '[DD]',
            fractionDigits: 5
        },
        measurements: {
            $ref: '#/definitions/measurements'
        },
        isCompleted: {
            title: 'Is Completed',
            type: 'boolean'
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
    measurements: [
        [new Date(2019, 2, 1), 0, 0],
        [new Date(2019, 2, 2), 1, 2],
        [new Date(2019, 2, 3), 2, 4]
    ]
};
