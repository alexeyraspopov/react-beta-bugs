import {
  use,
  useSyncExternalStore,
  useTransition,
  Suspense,
  useState,
  useMemo,
  useEffect,
} from "react";
import { createRoot } from "react-dom/client";

createRoot(document.querySelector("main")!).render(<App />);

function App() {
  return (
    <section>
      <p>
        A simple controlled element that unwraps async value via use() and updates state via
        useTransition().
      </p>
      <p>
        Expected behavior: "Loading" during initial render; when clicking on the button it becomes
        half transparent and then goes back to black with a new value without extra "Loading" state.
      </p>
      <SimpleAsyncFlow />
      <hr />
      <p>
        Slightly more complicated async flow. The same use of use(), useTransition(), and Suspense,
        but the target promise is delivered via synchronous event emitter that the component
        subscribes to via useSyncExternalStore().
      </p>
      <p>
        Expected behavior (same as for the case above): "Loading" during initial render; when
        clicking on the button it becomes half transparent and then goes back to black with a new
        value without extra "Loading" state.
      </p>
      <StoreBasedFlow />
      <hr />
      <p>
        The same flow as above, but this time useSyncExternalStore() is implemented naively using
        useState() and useEffect().
      </p>
      <StoreBasedFlowShim />
    </section>
  );
}

function SimpleAsyncFlow() {
  let [value, setValue] = useState(() => delayed(Math.random()));
  return (
    <Suspense fallback={<p>Loading</p>}>
      <SimpleControlledDisplay promise={value} onChange={setValue} />
    </Suspense>
  );
}

function SimpleControlledDisplay({
  promise,
  onChange,
}: {
  promise: Promise<number>;
  onChange: (value: Promise<number>) => void;
}) {
  let value = use(promise);
  let [pending, startTransition] = useTransition();
  let click = () => {
    startTransition(() => {
      onChange(delayed(Math.random()));
    });
  };
  return (
    <div>
      <button onClick={click}>Refresh</button>
      <p style={{ opacity: pending ? 0.5 : 1 }}>{value}</p>
    </div>
  );
}

function StoreBasedFlow() {
  let atom = useMemo(() => createAtom(delayed(Math.random())), []);
  return (
    <Suspense fallback={<p>Loading</p>}>
      <ExternallyControlledDisplay atom={atom} />
    </Suspense>
  );
}

function ExternallyControlledDisplay({ atom }: { atom: Atom<Promise<number>> }) {
  let promise = useSyncExternalStore(atom.subscribe, atom.get);
  let value = use(promise);
  let [pending, startTransition] = useTransition();
  let click = () => {
    startTransition(() => {
      atom.set(delayed(Math.random()));
    });
  };
  return (
    <div>
      <button onClick={click}>Refresh</button>
      <p style={{ opacity: pending ? 0.5 : 1 }}>{value}</p>
    </div>
  );
}

function StoreBasedFlowShim() {
  let atom = useMemo(() => createAtom(delayed(Math.random())), []);
  return (
    <Suspense fallback={<p>Loading</p>}>
      <ExternallyControlledDisplayShim atom={atom} />
    </Suspense>
  );
}

function ExternallyControlledDisplayShim({ atom }: { atom: Atom<Promise<number>> }) {
  let promise = useSyncExternalStoreShim(atom.subscribe, atom.get);
  let value = use(promise);
  let [pending, startTransition] = useTransition();
  let click = () => {
    startTransition(() => {
      atom.set(delayed(Math.random()));
    });
  };
  return (
    <div>
      <button onClick={click}>Refresh</button>
      <p style={{ opacity: pending ? 0.5 : 1 }}>{value}</p>
    </div>
  );
}

function useSyncExternalStoreShim<T>(
  subscribe: (cb: () => void) => () => void,
  getSnapshot: () => T,
): T {
  let [snapshot, setSnapshot] = useState(getSnapshot);
  useEffect(() => subscribe(() => setSnapshot(getSnapshot)), [subscribe, getSnapshot]);
  return snapshot;
}

function delayed<T>(value: T) {
  return new Promise<T>((resolve) => setTimeout(resolve, 1000, value));
}

type Atom<T> = ReturnType<typeof createAtom<T>>;

function createAtom<T>(value: T, events = new EventTarget()) {
  return {
    get() {
      return value;
    },
    set(newValue: T) {
      value = newValue;
      events.dispatchEvent(new Event("change"));
    },
    subscribe(cb: () => void) {
      events.addEventListener("change", cb);
      return () => events.removeEventListener("change", cb);
    },
  };
}
