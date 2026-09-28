'use strict';

const DEFAULT_LEVELS = Object.freeze([
    'Beginner',
    'Elementary',
    'Pre Intermediate',
    'Intermediate',
    'Upper Intermediate',
    'Advanced'
]);

window.EACC_CONFIG = Object.freeze({
    appsScriptUrl: 'https://script.google.com/macros/s/AKfycbw2dtGbPMtZGzOOIho077-m42UUPnN2t7ds10sqGejuCJTkLTszfPU-AbNlyW-gZRFErw/exec',

    adultRoutes: Object.freeze({
        'General English': 'G.E',
        'Conversation': 'CONVO',
        'TOEFL': 'TOEFL AND IELTS',
        'IELTS': 'TOEFL AND IELTS',
        'PTE': 1846010792,
        'OET': 1846010792,
        'Spanish': 'SPANISH',
        'German': 'GERMAN',
        'Italian': 'ITALIAN',
        'French': 'FRENCH'
    }),

    kidsCamps: Object.freeze([
        'Summer Camp 1',
        'Summer Camp 2',
        'Summer Camp 3',
        'Winter Camp'
    ]),

    youthCamps: Object.freeze([
        'Summer Camp 1',
        'Summer Camp 2',
        'Winter Camp'
    ]),

    kidsLevels: Object.freeze([
        'Pre 1',
        'Pre 2',
        'Pre 3',
        'Pre 4',
        'Foundation',
        ...DEFAULT_LEVELS,
        'Advanced Plus'
    ]),

    youthLevels: Object.freeze([
        'Foundation',
        ...DEFAULT_LEVELS,
        'Advanced Plus'
    ]),

    examLevelLanguages: Object.freeze(['IELTS', 'TOEFL', 'PTE', 'OET'])
});
