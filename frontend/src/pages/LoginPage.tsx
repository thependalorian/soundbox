import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SoundBoxDevice from '../components/Public/SoundBoxDevice';
import wordmark from '../assets/brand/soundbox-wordmark.png';
import { BRAND } from '../lib/copy/public';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const [searchParams] = useSearchParams();

  // Which door they came through. Only changes what the page says — the
  // credentials decide the actual role, so a wrong hint cannot grant access.
  const arriving = searchParams.get('as');
  const ARRIVAL: Record<string, { title: string; detail: string }> = {
    merchant: {
      title: 'Sign in to your business',
      detail: 'See your payments, your box, and what you have taken.',
    },
    regulator: {
      title: 'Sign in for oversight',
      detail: 'Coverage, market structure and the monthly returns.',
    },
    admin: {
      title: 'Administrator sign-in',
      detail: 'Devices, onboarding and platform settings.',
    },
  };
  const arrival = (arriving && ARRIVAL[arriving]) || null;
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blush-tint">
      <Card variant="elevated" className="p-40 w-full max-w-md">
        {/* The device itself, rather than a wordmark. Operators sign in here
            every day; showing the thing they manage is more use than a
            second copy of the brand name. */}
        <div className="flex flex-col items-center mb-32">
          <div className="scale-75 origin-center -my-16">
            <SoundBoxDevice state="idle" />
          </div>
          <img
            src={wordmark}
            alt={BRAND.name}
            className="h-32 w-auto mt-8"
            width={401}
            height={106}
          />
          <p className="text-caption font-sohne text-slate mt-8">{BRAND.tagline}</p>
          {arrival && (
            <div className="mt-24 text-center">
              <h1 className="text-heading-sm font-signifier text-ink">{arrival.title}</h1>
              <p className="text-caption font-sohne text-slate mt-4">{arrival.detail}</p>
            </div>
          )}
          <p className="text-body font-sohne text-slate mt-4">Sign in to manage your devices</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-20">
          <div>
            <label className="block text-caption font-sohne text-slate mb-4">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full border border-mist rounded-inputs px-16 py-12 text-body font-sohne focus:outline-none focus:ring-2 focus:ring-ink/20"
              required
            />
          </div>
          <div>
            <label className="block text-caption font-sohne text-slate mb-4">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full border border-mist rounded-inputs px-16 py-12 text-body font-sohne focus:outline-none focus:ring-2 focus:ring-ink/20"
              required
            />
          </div>
          {error && <div className="text-status-danger text-caption font-sohne">{error}</div>}
          <Button type="submit" variant="filled" className="w-full">
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
