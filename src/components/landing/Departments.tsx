import { DEPARTMENTS } from "./data";

export default function Departments() {
  return (
    <section id="departments" className="cats">
      <div className="wrap">
        <div className="shead reveal">
          <div className="tag">What we distribute</div>
          <h2 className="sx">Everything behind<br />the counter.</h2>
          <p>
            A brief look at the categories Satya supplies. Live catalog, case pricing and ordering
            are reserved for verified trade accounts inside the order portal.
          </p>
        </div>
        <div className="capi-grid">
          {DEPARTMENTS.map(({ Icon, name, desc }) => (
            <div className="capi reveal" key={name}>
              <div className="ic"><Icon /></div>
              <h3>{name}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
