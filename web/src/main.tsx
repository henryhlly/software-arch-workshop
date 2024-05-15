import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

export function App() {
  const [fullName, setFullName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [resume, setResume] = useState<File | null | undefined>();

  const [isSuccess, setIsSuccess] = useState<
    | {
        state: 'err';
        msg: string;
      }
    | {
        state: 'success';
      }
    | {
        state: 'loading';
      }
    | {
        state: 'not-sent';
      }
  >({
    state: 'not-sent',
  });

  const handleSubmit = () => {
    const submitData = async () => {
      console.log('Submitting');
      if (!resume) return;
      const formData = new FormData();
      formData.append('resume', resume);
      formData.append('fullName', fullName);
      formData.append('email', emailAddress);
      const res = await fetch('http://localhost:3000/apply', {
        method: 'POST',
        body: formData,
      });
      switch (res.status) {
        case 200: {
          setIsSuccess({
            state: 'success',
          });
          break;
        }
        case 400: {
          setIsSuccess({
            state: 'err',
            msg: 'Bad Request',
          });
          break;
        }
        case 500: {
          setIsSuccess({
            state: 'err',
            msg: 'Could not apply',
          });
          break;
        }
      }
    };
    submitData();
  };

  return (
    <main>
      <div>
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email Address"
          value={emailAddress}
          onChange={(e) => setEmailAddress(e.target.value)}
        />
        <input
          type="file"
          placeholder="Resume"
          onChange={(e) => setResume(e.target.files?.item(0))}
        />
        <button onClick={handleSubmit}>Submit</button>
        <p>{isSuccess.state == 'success' && 'Successfully Applied'}</p>
        <p>{isSuccess.state == 'err' && isSuccess.msg}</p>
        <p>{isSuccess.state == 'loading' && 'Loading...'}</p>
      </div>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
