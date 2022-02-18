module.exports = {
    "env": {
      "node": true,
      "mocha": true,
      "es6": true
    },
    "extends": "airbnb-base",
    "plugins": [],
    "parserOptions": {
      "sourceType": "module"
    },
    "rules": {
      "strict": [
        "error"
      ],
      "arrow-parens": [
        "error",
        "always"
      ],
      "arrow-body-style": [
        2,
        "as-needed"
      ],
      "comma-dangle": [
        2,
        "always-multiline"
      ],
      "indent": [
        2,
        2,
        {
          "SwitchCase": 1
        }
      ],
      "max-len": 0,
      "newline-per-chained-call": 0,
      "no-console": 1,
      "no-use-before-define": 0,
      "prefer-template": 2,
      "class-methods-use-this": 0,
      "no-useless-constructor": 0,
      "comma-dangle": ["error", "never"]
    },
    "globals": {
      "expect": true
    }
};
