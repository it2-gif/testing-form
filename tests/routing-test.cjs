const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const backend = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps-script/Code.gs'), 'utf8'), backend);

const winterRoutes = [
    ['Kids', 'Winter Camp Kids 1', 1125972872],
    ['Kids', 'Winter Camp Kids 2', 100630474],
    ['Youth', 'Winter Camp Youth', 729068088]
];

for (const [programme, camp, gid] of winterRoutes) {
    test(`${programme}: ${camp} validates without language and resolves the exact sheet gid`, () => {
        const submission = backend.validateAndNormalizeSubmission_({
            name: 'Routing Test', mobileNumber: '01000000000', programme,
            camp: `  ${camp.toLowerCase()}  `, level: 'Beginner', testDate: '2026-11-08'
        });
        assert.equal(submission.language, '');
        assert.equal(submission.camp, camp);
        const destination = backend.getDestinationSheetName_(submission.programme, submission.language, submission.camp);
        assert.equal(destination, gid);
        const intendedSheet = { getSheetId: () => gid };
        const spreadsheet = { getSheets: () => [{ getSheetId: () => 999 }, intendedSheet] };
        assert.equal(backend.getSheetByNameSafe_(spreadsheet, destination), intendedSheet);
        assert.throws(() => backend.getSheetByNameSafe_({ getSheets: () => [] }, destination), /Destination sheet not found for gid/);
    });
}

test('Winter destinations cannot be selected for the wrong programme', () => {
    assert.throws(() => backend.getDestinationSheetName_('Kids', '', 'Winter Camp Youth'), /No Kids destination/);
    for (const camp of ['Winter Camp Kids 1', 'Winter Camp Kids 2']) {
        assert.throws(() => backend.getDestinationSheetName_('Youth', '', camp), /No Youth destination/);
    }
});

test('Existing summer, adult, and private routes remain available', () => {
    assert.equal(backend.getDestinationSheetName_('Kids', '', 'Summer Camp 3'), 'Summer Camp Kids - Camp 3');
    assert.equal(backend.getDestinationSheetName_('Youth', '', 'Summer Camp 2'), 'Summer Camp Youths - Camp 2');
    assert.equal(backend.getDestinationSheetName_('Adults', 'General English', ''), 'G.E');
    assert.equal(backend.getDestinationSheetName_('Private', '', ''), 'PRIV');
    assert.throws(() => backend.getDestinationSheetName_('Youth', '', 'Winter Camp'), /No Youth destination/);
    assert.throws(() => backend.getDestinationSheetName_('Kids', '', 'Winter Camp 3'), /No Kids destination/);
});
