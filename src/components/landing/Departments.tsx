import { DEPARTMENTS } from "./data";

export default function Departments() {
  return (
    <section id="departments" className="cats">
      <div className="wrap">
        <div className="shead reveal">
          <div className="tag">What we distribute</div>
          <h2 className="sx">What we keep<br />in stock.</h2>
          <p>
            The categories we carry for convenience retailers. Live catalog, case pricing and ordering
            are reserved for verified trade accounts in the order portal.
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
