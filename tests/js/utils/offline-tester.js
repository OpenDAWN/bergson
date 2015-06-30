(function () {

    "use strict";

    fluid.defaults("berg.test.clock.testCase.offline", {
        gradeNames: ["berg.test.clock.testCase", "autoInit"],

        invokers: {
            testInitState: {
                funcName: "berg.test.clock.testCase.offline.testInitial",
                args: ["{clock}", "{tester}"]
            },

            testTick: {
                funcName: "berg.test.clock.testCase.offline.testTick",
                args: ["{clock}", "{tester}"]
            }
        }
    });

    berg.test.clock.testCase.offline.testInitial = function (clock, that) {
        QUnit.equal(clock.options.rate, that.options.expected.rate,
            "The clock should be initialized with a rate of " +
            that.options.expected.rate + ".");
        QUnit.equal(clock.time, 0,
            "The clock should be initialized with a time of 0.");

        QUnit.equal(clock.tickDuration, that.options.expected.tickDuration,
            "The clock should have been initialized with a tick duration of " +
            that.options.expected.tickDuration + " seconds.");
    };

    berg.test.clock.testCase.offline.testTick = function (clock, that) {
        that.applier.change("expectedTime",
            that.model.expectedTime + that.options.expected.tickDuration);

        QUnit.equal(clock.time, that.model.expectedTime,
            "The clock should have been incremented by 1/" +
            that.options.expected.rate + " of a second.");
    };


    fluid.defaults("berg.test.clock.tester.offline", {
        gradeNames: ["berg.test.clock.tester", "autoInit"],

        model: {
            expectedTime: 0
        },

        expected: {
            tickDuration: 1
        },

        components: {
            testCase: {
                type: "berg.test.clock.testCase.offline"
            },

            clock: {
                type: "berg.clock.offline"
            }
        }
    });

    fluid.defaults("berg.test.clock.tester.offlineManual", {
        gradeNames: [
            "berg.test.clock.tester.offline",
            "berg.test.clock.tester.manual",
            "autoInit"
        ]
    });

}());