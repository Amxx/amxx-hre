module.exports = {
    skipFiles: [
        'mocks',
    ],
    mocha: {
        fgrep: '[skip-on-coverage]',
        invert: true,
    },
}
