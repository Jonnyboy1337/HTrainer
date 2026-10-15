export const AGE_KEY = 'htrainer-age-confirmed';

export function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  const confirm = () => {
    try {
      localStorage.setItem(AGE_KEY, '1');
    } catch {
      // ask again next visit
    }
    onConfirm();
  };
  return (
    <div className="center-screen">
      <div className="panel narrow">
        <h1>Adults only</h1>
        <p>
          This game contains explicit sexual content loaded from third-party sources. All characters are fictional adults.
          You must be 18 or older (or the age of majority where you live) to continue.
        </p>
        <div className="row">
          <button className="primary" onClick={confirm}>I am 18 or older</button>
          <a className="button" href="https://www.google.com">Leave</a>
        </div>
      </div>
    </div>
  );
}
