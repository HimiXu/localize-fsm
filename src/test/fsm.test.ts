import { randomUUID } from "crypto";
import { readFileSync, unlinkSync } from "fs";
import {
    Machine,
    State,
    Event,
    saveState,
    reloadState,
    MachineBuilder,
} from "../main/fsm";

const eventGeneratorFunction = (eventName: string) => {
    return (): Event => {
        return { id: randomUUID(), name: eventName };
    };
};

const event1Generator = eventGeneratorFunction("event1");
const event2Generator = eventGeneratorFunction("event2");

class State0 extends State {
    constructor() {
        super({});
    }
}
class State1 extends State {
    constructor() {
        super({});
    }
}
class State2 extends State {
    constructor() {
        super({
            event1: async (event: Event) => {
                const result = "Event1 was fired 3 times in a row!";
                console.log(result);
                return result;
            },
        });
    }
}

const initFSM = (): Machine => {
    const state0 = new State0();
    const state1 = new State1();
    const state2 = new State2();
    const fsm = new MachineBuilder()
        .states([state0, state1, state2])
        .initialStateName(state0.name)
        .transition(state0.name, "event1", state1.name)
        .transition(state1.name, "event1", state2.name)
        .transition(state1.name, "event2", state0.name)
        .transition(state2.name, "event1", state2.name)
        .transition(state2.name, "event2", state0.name)
        .build();
    return fsm;
};

describe("test FSM firing 3 events in a row", () => {
    it("should return a string", async () => {
        const fsm = initFSM();
        let result;

        // should start from state0
        expect(fsm.currentStateName).toBe(State0.name);

        result = await fsm.handle(event1Generator());
        // after 1st event should return nothing and proceed to state1
        expect(result).toBeUndefined();
        expect(fsm.currentStateName).toBe(State1.name);

        result = await fsm.handle(event1Generator());
        // after 2nd event should return nothing and proceed to state2
        expect(result).toBeUndefined();
        expect(fsm.currentStateName).toBe(State2.name);

        result = await fsm.handle(event1Generator());
        // after 3rd event should return the string
        expect(result).toBe("Event1 was fired 3 times in a row!");
    });
});

describe("test FSM firing 3 events not in a row", () => {
    it("should not return a string", async () => {
        const fsm = initFSM();
        // test the fsm
        let result;

        // should start from state0
        expect(fsm.currentStateName).toBe(State0.name);

        result = await fsm.handle(event1Generator());
        // after 1st event1 should return nothing and proceed to state1
        expect(result).toBeUndefined();
        expect(fsm.currentStateName).toBe(State1.name);

        result = await fsm.handle(event2Generator());
        // after event2 is fired should return nothing and proceed to state0
        expect(result).toBeUndefined();
        expect(fsm.currentStateName).toBe(State0.name);

        result = await fsm.handle(event1Generator());
        // after 1st event1 should return nothing and proceed to state1
        expect(result).toBeUndefined();
        expect(fsm.currentStateName).toBe(State1.name);

        result = await fsm.handle(event1Generator());
        // after 2nd event1 should return nothing and proceed to state2
        expect(result).toBeUndefined();
        expect(fsm.currentStateName).toBe(State2.name);

        result = await fsm.handle(event2Generator());
        // after event2 is fired should return nothing and proceed to state0
        expect(result).toBeUndefined();
        expect(fsm.currentStateName).toBe(State0.name);
    });
});

describe("test FSM persistence", () => {
    it("should reload state successfully", async () => {
        let fsm = initFSM();
        expect(fsm.currentStateName).toBe(State0.name);
        await fsm.handle(event1Generator());
        expect(fsm.currentStateName).toBe(State1.name);

        // persist state
        await saveState(fsm, "testing-persistence");

        // reload FSM
        fsm = initFSM();
        await reloadState(fsm, "testing-persistence");
        expect(fsm.currentStateName).toBe(State1.name);

        // cleanup
        unlinkSync("testing-persistence");
    });
});
