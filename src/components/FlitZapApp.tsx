'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Calendar,
  Clock,
  User,
  CreditCard,
  Check,
  ArrowLeft,
  Home,
  Briefcase,
  PartyPopper,
  Download,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

type Booking = {
  id: number;
  service: string;
  date: string;   // 'YYYY-MM-DD'
  time: string;   // '10:00 AM'
  status: 'Confirmed' | 'Cancelled' | 'Completed';
  reference: string;
  customer: { name: string; email: string; phone: string; address: string };
  notes?: string;
  createdAt: string;
};

const PRIMARY = '#3788da';
const DARK = '#1a1a2e';
const TEXT = '#4a4a4a';
const CANVAS = '#F5F1E8';
const BORDER = '#E5DCC5';
const SOFT = '#FFFCE2';
const PALEBLUE = '#F7FBFF';

const FlitZapApp = () => {
  const [currentStep, setCurrentStep] = useState<'home' | 'time-selection' | 'checkout' | 'confirmation'>('home');
  const [selectedService, setSelectedService] = useState<{ id: string; title: string; price: string; icon: any } | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [userInfo, setUserInfo] = useState({ email: '', phone: '', address: '', name: '', notes: '' });
  const [bookingReference, setBookingReference] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);         // set localStorage.fz_admin='1' to reveal
  const [showAdmin, setShowAdmin] = useState(false);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [logoOk, setLogoOk] = useState(true);
  const [busy, setBusy] = useState(false);

  // NEW: supports deep link /?ref=FZ-XXXX to show just that booking in dashboard
  const [deepRef, setDeepRef] = useState<string | null>(null);

  const services = [
    {
      id: 'house-cleaning',
      title: 'Cleaning Services',
      description: 'Emergency cleaning when you need a spotless space right away. Perfect for last-minute or urgent needs.',
      price: 'Get Quote',
      icon: Home,
    },
    {
      id: 'general-labor',
      title: 'General Labor',
      description: 'Need an extra hand? Our general laborers help with moving, setup, and day-to-day tasks.',
      price: 'Get Quote',
      icon: Briefcase,
    },
    {
      id: 'event-assistant',
      title: 'Event Assistant',
      description: 'We keep your event clean and organized from start to finish.',
      price: 'Get Quote',
      icon: PartyPopper,
    },
  ];

  const timeSlots = ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM'];

  // seed demo data + load saved user + admin flag
  useEffect(() => {
    setAllBookings([
      {
        id: 1,
        service: 'Cleaning Services',
        date: '2025-10-10',
        time: '10:00 AM',
        status: 'Confirmed',
        reference: 'FZ-2025-ABC123',
        customer: {
          name: 'Sarah Johnson',
          email: 'sarah@email.com',
          phone: '(470) 604-1366',
          address: '123 Oak St, Marietta, GA 30060',
        },
        notes: 'Please focus on kitchen',
        createdAt: '2025-10-03T10:30:00',
      },
    ]);

    try {
      const saved = localStorage.getItem('fz_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        setUserInfo(parsed);
        if (parsed?.email) setIsLoggedIn(true);
      }
      const adminFlag = localStorage.getItem('fz_admin');
      if (adminFlag === '1') setIsAdmin(true);
    } catch {}
  }, []);

  // NEW: read ?ref= on first load -> open dashboard filtered to that booking
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref) {
        setDeepRef(ref);
        setShowDashboard(true);
        setCurrentStep('home');
      }
    } catch {}
  }, []);

  // persist user info locally (so greeting & dashboard filter work on refresh)
  useEffect(() => {
    try { localStorage.setItem('fz_user', JSON.stringify(userInfo)); } catch {}
  }, [userInfo]);

  const firstName = (userInfo.name || '').trim().split(' ')[0] || '';

  const generateBookingReference = () =>
    `FZ-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const getNextWeekDates = () => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const handleServiceSelect = (service: { id: string; title: string; price: string; icon: any }) => {
    setSelectedService(service);
    setCurrentStep('time-selection');
  };

  const handleTimeSelection = () => {
    if (selectedDate && selectedTime) setCurrentStep('checkout');
  };

  const handleBooking = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const reference = generateBookingReference();
      const newBooking: Booking = {
        id: allBookings.length + 1,
        service: selectedService?.title || '',
        date: selectedDate,
        time: selectedTime,
        status: 'Confirmed',
        reference,
        customer: {
          name: userInfo.name,
          email: userInfo.email,
          phone: userInfo.phone,
          address: userInfo.address,
        },
        notes: userInfo.notes,
        createdAt: new Date().toISOString(),
      };

      // Write to Supabase
      const { error } = await supabase
        .from('bookings')
        .insert({
          reference: newBooking.reference,
          service: newBooking.service,
          date: newBooking.date,
          time: newBooking.time,
          status: newBooking.status,
          customer_name: newBooking.customer.name,
          customer_email: newBooking.customer.email,
          customer_phone: newBooking.customer.phone,
          customer_address: newBooking.customer.address,
          notes: newBooking.notes ?? null,
        });

      if (error) {
        console.error('Supabase insert error:', error);
        alert('Could not save booking (database). Check console for details.');
        return;
      }

      // Notify via Brevo (single CTA + unsquished logo)
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'booking.created',
            toEmail: userInfo.email,
            toName: userInfo.name,
            reference,
            service: selectedService?.title || '',
            date: selectedDate,
            time: selectedTime,
            name: userInfo.name,
            email: userInfo.email,
            phone: userInfo.phone,
            address: userInfo.address,
            notes: userInfo.notes || '',
          }),
        });
      } catch (notifyErr) {
        console.warn('Notify failed (continuing):', notifyErr);
      }

      // Mirror to UI
      setAllBookings((prev) => [...prev, newBooking]);
      setBookingReference(reference);
      setIsLoggedIn(true);
      setCurrentStep('confirmation');
    } catch (e) {
      console.error('SAVE TO DATABASE FAILED:', e);
      alert('Could not save booking. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const resetFlow = () => {
    setCurrentStep('home');
    setSelectedService(null);
    setSelectedDate('');
    setSelectedTime('');
    setBookingReference('');
    setShowDashboard(false);
    setShowAdmin(false);
    setDeepRef(null);
  };

  const cancelBooking = async (bookingId: number) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'Cancelled' })
        .eq('id', bookingId);

      if (error) {
        console.error('Cancel error:', error);
        alert('Could not cancel booking.');
        return;
      }

      setAllBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'Cancelled' } : b)));

      // fire cancel email
      const b = allBookings.find(x => x.id === bookingId);
      if (b) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'booking.cancelled',
            toEmail: b.customer.email,
            toName: b.customer.name,
            reference: b.reference,
            service: b.service,
            date: b.date,
            time: b.time,
            name: b.customer.name,
            email: b.customer.email,
            phone: b.customer.phone,
            address: b.customer.address,
            notes: b.notes || '',
          }),
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Cancel exception:', e);
      alert('Could not cancel booking.');
    }
  };

  const openReschedule = (booking: Booking) => {
    setRescheduleBooking(booking);
    setRescheduleDate('');
    setRescheduleTime('');
    setShowReschedule(true);
  };

  const closeReschedule = () => {
    setShowReschedule(false);
    setRescheduleBooking(null);
  };

  const saveReschedule = async () => {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleTime) return;

    // Update DB
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ date: rescheduleDate, time: rescheduleTime })
        .eq('reference', rescheduleBooking.reference);

      if (error) {
        alert('Could not reschedule (database).');
        return;
      }
    } catch {
      alert('Could not reschedule (network).');
      return;
    }

    // Update UI
    setAllBookings(prev =>
      prev.map(b => (b.id === rescheduleBooking.id ? { ...b, date: rescheduleDate, time: rescheduleTime } : b)),
    );

    // send reschedule email
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'booking.rescheduled',
          toEmail: rescheduleBooking.customer.email,
          toName: rescheduleBooking.customer.name,
          reference: rescheduleBooking.reference,
          service: rescheduleBooking.service,
          date: rescheduleDate,
          time: rescheduleTime,
          name: rescheduleBooking.customer.name,
          email: rescheduleBooking.customer.email,
          phone: rescheduleBooking.customer.phone,
          address: rescheduleBooking.customer.address,
          notes: rescheduleBooking.notes || '',
        }),
      });
    } catch {}

    closeReschedule();
  };

  const exportBookings = () => {
    const csvContent = [
      ['Reference','Service','Date','Time','Status','Name','Email','Phone','Address','Notes'],
      ...allBookings.map((b) => [
        b.reference, b.service, b.date, b.time, b.status,
        b.customer.name, b.customer.email, b.customer.phone, b.customer.address, b.notes || '',
      ]),
    ].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flitzap-bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: CANVAS }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b" style={{ borderColor: BORDER }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            {(currentStep !== 'home' || (isAdmin && showAdmin)) && !showDashboard && (
              <button
                onClick={() => {
                  if (showAdmin) { setShowAdmin(false); setCurrentStep('home'); }
                  else if (currentStep === 'time-selection') setCurrentStep('home');
                  else if (currentStep === 'checkout') setCurrentStep('time-selection');
                  else if (currentStep === 'confirmation') resetFlow();
                }}
                className="mr-3 p-1 hover:bg-gray-100 rounded"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" style={{ color: DARK }} />
              </button>
            )}

            {/* Logo with safe fallback */}
            <h1
              className="cursor-pointer"
              onClick={() => {
                // go home inside the app
                resetFlow();
              }}
              aria-label="FlitZap Home"
              title="FlitZap"
            >
              {logoOk ? (
                <Image
                  src="/flitzap-logo.png"
                  alt="FlitZap"
                  width={160}
                  height={40}
                  priority
                  onError={() => setLogoOk(false)}
                  style={{ height: 'auto', width: '160px' }} // prevent squish
                />
              ) : (
                <span className="text-2xl font-bold">
                  <span style={{ color: DARK }}>Flit</span>
                  <span style={{ color: PRIMARY }}>Zap</span>
                </span>
              )}
            </h1>
          </div>

          {/* Right controls */}
          <div className="flex items-center space-x-3">
            {/* NEW: Go back to FlitZap (marketing site) */}
            <a
              href="https://www.flitzap.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-md text-sm font-medium hover:opacity-90"
              style={{ border: `1px solid ${BORDER}`, color: DARK, background: '#fff' }}
              title="Go back to FlitZap"
            >
              Go back to FlitZap
            </a>

            {isLoggedIn && (
              <>
                {firstName && (
                  <span className="hidden sm:block text-sm font-medium" style={{ color: DARK }}>
                    Hi, {firstName}
                  </span>
                )}
                <button
                  onClick={() => { setShowDashboard(!showDashboard); setShowAdmin(false); }}
                  className="p-2 rounded-full hover:opacity-90"
                  style={{ backgroundColor: DARK, color: '#fff' }}
                  title="My Bookings"
                  aria-label="Open My Bookings"
                >
                  <User className="w-4 h-4" />
                </button>
              </>
            )}
            {/* Hidden admin entry: set localStorage.fz_admin='1' to reveal */}
            {isAdmin && (
              <button
                onClick={() => setShowAdmin(!showAdmin)}
                className="px-3 py-2 rounded-md text-sm font-medium hover:opacity-90"
                style={{ backgroundColor: PRIMARY, color: '#fff' }}
                title="Admin Dashboard"
              >
                Admin
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Home */}
      {!showAdmin && !showDashboard && currentStep === 'home' && (
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2" style={{ color: DARK }}>
              Your Instant Service & Task Assistant
            </h2>
            <p style={{ color: TEXT }}>Extra hands, right when you need them</p>
          </div>

          <div className="space-y-4">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all cursor-pointer"
                  style={{ border: `1px solid ${BORDER}` }}
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: PRIMARY }}>
                      <Icon className="w-6 h-6" style={{ color: '#fff' }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1" style={{ color: DARK }}>{service.title}</h3>
                      <p className="text-sm mb-3" style={{ color: TEXT }}>{/* description trimmed on purpose */}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-medium" style={{ color: PRIMARY }}>{service.price}</span>
                        <button
                          className="px-4 py-2 rounded-lg text-sm font-medium"
                          style={{ backgroundColor: PRIMARY, color: '#fff' }}
                          type="button"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center text-sm" style={{ color: TEXT }}>
            <p>📞 (470) 604-1366 • 📧 info@flitzap.com</p>
          </div>
        </div>
      )}

      {/* Time selection */}
      {!showAdmin && !showDashboard && currentStep === 'time-selection' && (
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="bg-white rounded-lg p-6 mb-6 shadow-md" style={{ border: `1px solid ${BORDER}` }}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: PRIMARY }}>
                {selectedService && React.createElement(selectedService.icon, { className: 'w-5 h-5', style: { color: '#fff' } })}
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: DARK }}>{selectedService?.title}</h3>
                <p className="text-sm" style={{ color: PRIMARY }}>{selectedService?.price}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3 flex items-center" style={{ color: DARK }}>
                <Calendar className="w-4 h-4 mr-2" /> Select Date
              </label>
              <div className="grid grid-cols-1 gap-2">
                {getNextWeekDates().map((date) => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className="p-3 text-left rounded-lg"
                    style={{
                      border: `1px solid ${BORDER}`,
                      backgroundColor: selectedDate === date ? PRIMARY : 'white',
                      color: selectedDate === date ? '#fff' : DARK,
                    }}
                  >
                    {formatDate(date)}
                  </button>
                ))}
              </div>
            </div>

            {selectedDate && (
              <div>
                <label className="block text-sm font-medium mb-3 flex items-center" style={{ color: DARK }}>
                  <Clock className="w-4 h-4 mr-2" /> Select Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className="p-3 text-sm rounded-lg"
                      style={{
                        border: `1px solid ${BORDER}`,
                        backgroundColor: selectedTime === time ? PRIMARY : 'white',
                        color: selectedTime === time ? '#fff' : DARK,
                      }}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedDate && selectedTime && (
            <button
              onClick={handleTimeSelection}
              className="w-full mt-8 py-3 rounded-lg font-medium"
              style={{ backgroundColor: PRIMARY, color: '#fff' }}
            >
              Continue to Checkout
            </button>
          )}
        </div>
      )}

      {/* Checkout */}
      {!showAdmin && !showDashboard && currentStep === 'checkout' && (
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="bg-white rounded-lg p-6 mb-6 shadow-md" style={{ border: `1px solid ${BORDER}` }}>
            <h3 className="font-semibold mb-4" style={{ color: DARK }}>🧾 Booking Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span style={{ color: TEXT }}>Service:</span><span className="font-medium" style={{ color: DARK }}>{selectedService?.title}</span></div>
              <div className="flex justify-between"><span style={{ color: TEXT }}>Date:</span><span className="font-medium" style={{ color: DARK }}>{formatDate(selectedDate)}</span></div>
              <div className="flex justify-between"><span style={{ color: TEXT }}>Time:</span><span className="font-medium" style={{ color: DARK }}>{selectedTime}</span></div>
            </div>
          </div>

          <div className="rounded-lg p-5 mb-6" style={{ backgroundColor: SOFT, border: `1px solid ${BORDER}` }}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: DARK }}>👤 Full Name</label>
                <input type="text" value={userInfo.name} onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                  className="w-full p-3 rounded-lg bg-white" style={{ border: `1px solid ${BORDER}` }} placeholder="Your full name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: DARK }}>📧 Email</label>
                <input type="email" value={userInfo.email} onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                  className="w-full p-3 rounded-lg bg-white" style={{ border: `1px solid ${BORDER}` }} placeholder="your@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: DARK }}>📱 Phone</label>
                <input type="tel" value={userInfo.phone} onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
                  className="w-full p-3 rounded-lg bg-white" style={{ border: `1px solid ${BORDER}` }} placeholder="(555) 123-4567" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: DARK }}>🏠 Service Address</label>
                <input type="text" value={userInfo.address} onChange={(e) => setUserInfo({ ...userInfo, address: e.target.value })}
                  className="w-full p-3 rounded-lg bg-white" style={{ border: `1px solid ${BORDER}` }} placeholder="123 Main St, City, State, ZIP" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: DARK }}>📝 Special Instructions</label>
                <textarea value={userInfo.notes} onChange={(e) => setUserInfo({ ...userInfo, notes: e.target.value })}
                  className="w-full p-3 rounded-lg bg-white" style={{ border: `1px solid ${BORDER}` }} rows={3} placeholder="Any special requests or notes..." />
              </div>
            </div>
          </div>

          <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: PALEBLUE, border: `1px solid ${BORDER}` }}>
            <p className="text-sm font-medium mb-2 flex items-center" style={{ color: DARK }}>
              <CreditCard className="w-4 h-4 mr-2" /> Payment Method
            </p>
            <p className="text-sm" style={{ color: TEXT }}>
              We’ll collect payment after your job is completed. You’ll receive a secure link by text to pay from your phone.
            </p>
          </div>

          <button
            onClick={handleBooking}
            disabled={busy || !userInfo.name || !userInfo.email || !userInfo.phone || !userInfo.address}
            className="w-full mt-2 py-3 rounded-lg font-medium disabled:opacity-50"
            style={{ backgroundColor: PRIMARY, color: '#fff' }}
          >
            {busy ? 'Saving…' : 'Confirm Booking'}
          </button>
        </div>
      )}

      {/* Confirmation */}
      {!showAdmin && !showDashboard && currentStep === 'confirmation' && (
        <div className="max-w-md mx-auto px-4 py-8 text-center">
          <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: PRIMARY }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-white">
              <Check className="w-8 h-8" style={{ color: PRIMARY }} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#fff' }}>Booking Confirmed!</h2>
            <p style={{ color: '#fff' }}>Your service has been successfully booked</p>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6 text-left shadow-md" style={{ border: `1px solid ${BORDER}` }}>
            <h3 className="font-semibold mb-4" style={{ color: DARK }}>Booking Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span style={{ color: TEXT }}>Reference:</span><span className="font-mono font-medium" style={{ color: PRIMARY }}>{bookingReference}</span></div>
              <div className="flex justify-between"><span style={{ color: TEXT }}>Service:</span><span className="font-medium" style={{ color: DARK }}>{selectedService?.title}</span></div>
              <div className="flex justify-between"><span style={{ color: TEXT }}>Date:</span><span className="font-medium" style={{ color: DARK }}>{formatDate(selectedDate)}</span></div>
              <div className="flex justify-between"><span style={{ color: TEXT }}>Time:</span><span className="font-medium" style={{ color: DARK }}>{selectedTime}</span></div>
              <div className="flex justify-between"><span style={{ color: TEXT }}>Address:</span><span className="font-medium" style={{ color: DARK }}>{userInfo.address}</span></div>
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={resetFlow} className="w-full py-3 rounded-lg font-medium" style={{ backgroundColor: PRIMARY, color: '#fff' }}>
              Book Another Service
            </button>
            <button
              onClick={() => { setShowDashboard(true); setCurrentStep('home'); setDeepRef(bookingReference); }}
              className="w-full py-3 rounded-lg font-medium bg-white"
              style={{ border: `1px solid ${BORDER}`, color: DARK }}
            >
              View My Booking
            </button>
          </div>
        </div>
      )}

      {/* Customer Dashboard */}
      {showDashboard && (
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ color: DARK }}>
              My Bookings{firstName ? ` — ${firstName}` : ''}
            </h2>
            <button
              onClick={() => { setShowDashboard(false); setCurrentStep('home'); setDeepRef(null); }}
              className="text-sm font-medium"
              style={{ color: PRIMARY }}
            >
              Back
            </button>
          </div>
          {allBookings
            .filter((b) =>
              deepRef
                ? b.reference === deepRef
                : (b.customer.email === userInfo.email || b.customer.phone === userInfo.phone)
            )
            .map((b) => (
              <div key={b.id} className="bg-white rounded-lg p-4 mb-4 shadow-md" style={{ border: `1px solid ${BORDER}` }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium" style={{ color: DARK }}>{b.service}</h3>
                    <p className="text-sm" style={{ color: TEXT }}>{formatDate(b.date)} at {b.time}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${b.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{b.status}</span>
                </div>
                <p className="text-xs mt-2" style={{ color: TEXT }}>Ref: {b.reference}</p>
                {b.notes && <p className="text-xs mt-1" style={{ color: TEXT }}><span className="font-semibold">Notes:</span> {b.notes}</p>}
                {b.status === 'Confirmed' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: BORDER }}>
                    <button onClick={() => openReschedule(b)} className="flex-1 py-2 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: PRIMARY, color: '#fff' }}>Reschedule</button>
                    <button onClick={() => cancelBooking(b.id)} className="flex-1 py-2 rounded-lg text-sm font-medium bg-white"
                      style={{ border: `1px solid ${BORDER}`, color: '#B42318' }}>Cancel</button>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Admin (hidden unless localStorage fz_admin='1') */}
      {isAdmin && showAdmin && (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold" style={{ color: DARK }}>Admin Dashboard</h2>
            <button onClick={exportBookings} className="flex items-center px-4 py-2 rounded-lg font-medium hover:opacity-90"
              style={{ backgroundColor: PRIMARY, color: '#fff' }}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: PRIMARY }}>
                <tr>
                  <th className="px-4 py-3 text-left" style={{ color: '#fff' }}>REF</th>
                  <th className="px-4 py-3 text-left" style={{ color: '#fff' }}>SERVICE</th>
                  <th className="px-4 py-3 text-left" style={{ color: '#fff' }}>CUSTOMER</th>
                  <th className="px-4 py-3 text-left" style={{ color: '#fff' }}>CONTACT</th>
                  <th className="px-4 py-3 text-left" style={{ color: '#fff' }}>DATE</th>
                  <th className="px-4 py-3 text-left" style={{ color: '#fff' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {allBookings.map((b) => (
                  <tr key={b.id} className="border-t hover:bg-gray-50" style={{ borderColor: BORDER }}>
                    <td className="px-4 py-4 font-mono" style={{ color: PRIMARY }}>{b.reference}</td>
                    <td className="px-4 py-4" style={{ color: DARK }}>{b.service}</td>
                    <td className="px-4 py-4" style={{ color: DARK }}>{b.customer.name}</td>
                    <td className="px-4 py-4">
                      <a href={`mailto:${b.customer.email}`} style={{ color: PRIMARY }}>{b.customer.email}</a><br/>
                      <a href={`tel:${b.customer.phone}`} style={{ color: PRIMARY }}>{b.customer.phone}</a>
                    </td>
                    <td className="px-4 py-4" style={{ color: TEXT }}>{b.date} {b.time}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${b.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{b.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reschedule modal */}
      {showReschedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" onClick={closeReschedule}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: DARK }}>Reschedule Booking</h3>
              <button onClick={closeReschedule}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: DARK }}>New Date</label>
                <div className="grid gap-2">
                  {getNextWeekDates().map((date) => (
                    <button
                      key={date}
                      onClick={() => setRescheduleDate(date)}
                      className="p-2 text-left rounded"
                      style={{
                        border: `1px solid ${BORDER}`,
                        backgroundColor: rescheduleDate === date ? PRIMARY : 'white',
                        color: rescheduleDate === date ? '#fff' : DARK,
                      }}
                    >
                      {formatDate(date)}
                    </button>
                  ))}
                </div>
              </div>
              {rescheduleDate && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: DARK }}>New Time</label>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setRescheduleTime(time)}
                        className="p-2 text-sm rounded"
                        style={{
                          border: `1px solid ${BORDER}`,
                          backgroundColor: rescheduleTime === time ? PRIMARY : 'white',
                          color: rescheduleTime === time ? '#fff' : DARK,
                        }}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={saveReschedule}
                disabled={!rescheduleDate || !rescheduleTime}
                className="w-full py-3 rounded-lg font-medium disabled:opacity-50"
                style={{ backgroundColor: PRIMARY, color: '#fff' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlitZapApp;
