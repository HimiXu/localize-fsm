import { randomUUID } from "crypto";
import { FSM, State, Event } from "../main/fsm";

const eventGeneratorFunction = (eventName: string) => {
    return (): Event => {
        return { id: randomUUID(), name: eventName };
    };
};

const event1Generator = eventGeneratorFunction("event1");
const event2Generator = eventGeneratorFunction("event2");

class State0 extends State {}
class State1 extends State {}
class State2 extends State {
    constructor() {
        super();
        this.registerHandler("event1", async (event: Event) => {
            const result = "Event1 was fired 3 times in a row!";
            console.log(result);
            return result;
        });
    }
}

const initFSM = (): FSM => {
    const state0 = new State0();
    const state1 = new State1();
    const state2 = new State2();
    const fsm = new FSM([state0, state1, state2], state0);
    fsm.registerTransition(state0.name, "event1", state1.name);
    fsm.registerTransition(state1.name, "event1", state2.name);
    fsm.registerTransition(state1.name, "event2", state0.name);
    fsm.registerTransition(state2.name, "event1", state2.name);
    fsm.registerTransition(state2.name, "event2", state0.name);
    return fsm;
};

describe("test FSM firing 3 events in a row", () => {
    it("should return a string", async () => {
        const fsm = initFSM();
        // test the fsm
        let result;

        // should start from state0
        expect(fsm.currentState).toBeInstanceOf(State0);

        result = await fsm.handle(event1Generator());
        // after 1st event should return nothing and proceed to state1
        expect(result).toBeUndefined();
        expect(fsm.currentState).toBeInstanceOf(State1);

        result = await fsm.handle(event1Generator());
        // after 2nd event should return nothing and proceed to state2
        expect(result).toBeUndefined();
        expect(fsm.currentState).toBeInstanceOf(State2);

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
        expect(fsm.currentState).toBeInstanceOf(State0);

        result = await fsm.handle(event1Generator());
        // after 1st event1 should return nothing and proceed to state1
        expect(result).toBeUndefined();
        expect(fsm.currentState).toBeInstanceOf(State1);

        result = await fsm.handle(event2Generator());
        // after event2 is fired should return nothing and proceed to state0
        expect(result).toBeUndefined();
        expect(fsm.currentState).toBeInstanceOf(State0);

        result = await fsm.handle(event1Generator());
        // after 1st event1 should return nothing and proceed to state1
        expect(result).toBeUndefined();
        expect(fsm.currentState).toBeInstanceOf(State1);

        result = await fsm.handle(event1Generator());
        // after 2nd event1 should return nothing and proceed to state2
        expect(result).toBeUndefined();
        expect(fsm.currentState).toBeInstanceOf(State2);

        result = await fsm.handle(event2Generator());
        // after event2 is fired should return nothing and proceed to state0
        expect(result).toBeUndefined();
        expect(fsm.currentState).toBeInstanceOf(State0);
    });
});
