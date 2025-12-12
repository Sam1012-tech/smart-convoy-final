import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Filter, Plus, Trash2, ChevronDown, ChevronUp, Truck, User, Package } from 'lucide-react';

const VEHICLE_TYPES = ['truck', 'van', 'jeep', 'ambulance', 'tanker'];
const LOAD_TYPES = ['medical', 'supplies', 'ammunition', 'fuel', 'personnel'];

export default function ConvoyHistory() {
  const navigate = useNavigate();
  const [convoys, setConvoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [selectedConvoy, setSelectedConvoy] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({
    vehicleType: 'truck',
    registrationNumber: '',
    driverName: '',
    loadType: 'medical',
    loadWeight: '',
    capacity: ''
  });
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [vehicleError, setVehicleError] = useState('');
  const [vehicleSuccess, setVehicleSuccess] = useState('');
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [convoyToDelete, setConvoyToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedConvoys, setExpandedConvoys] = useState(new Set());
  const [convoyVehicles, setConvoyVehicles] = useState({});
  const [loadingVehicles, setLoadingVehicles] = useState({});

  const fetchConvoys = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/convoys/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setConvoys(data.convoys || []);
      }
    } catch (err) {
      console.error('Error fetching convoys:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConvoyVehicles = async (convoyId) => {
    if (convoyVehicles[convoyId]) {
      return; // Already fetched
    }

    setLoadingVehicles(prev => ({ ...prev, [convoyId]: true }));
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/api/convoys/${convoyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setConvoyVehicles(prev => ({
          ...prev,
          [convoyId]: data.convoy?.vehicles || []
        }));
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    } finally {
      setLoadingVehicles(prev => ({ ...prev, [convoyId]: false }));
    }
  };

  const toggleConvoyExpand = (convoyId) => {
    const newExpanded = new Set(expandedConvoys);
    if (newExpanded.has(convoyId)) {
      newExpanded.delete(convoyId);
    } else {
      newExpanded.add(convoyId);
      fetchConvoyVehicles(convoyId);
    }
    setExpandedConvoys(newExpanded);
  };

  const getVehicleStatusColor = (status) => {
    const colors = {
      idle: 'text-slate-400 bg-slate-500/10',
      en_route: 'text-blue-400 bg-blue-500/10',
      at_checkpoint: 'text-yellow-400 bg-yellow-500/10',
      completed: 'text-green-400 bg-green-500/10',
      breakdown: 'text-red-400 bg-red-500/10',
    };
    return colors[status] || colors.idle;
  };

  useEffect(() => {
    fetchConvoys();
  }, []);

  const priorities = ['all', 'critical', 'high', 'medium', 'low'];
  
  const filtered = filter === 'all' 
    ? convoys 
    : convoys.filter(c => c.priority === filter);

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'text-red-400 bg-red-500/10 border-red-500/20',
      high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      low: 'text-green-400 bg-green-500/10 border-green-500/20',
    };
    return colors[priority] || colors.medium;
  };

  const openAddVehicleModal = (convoy, e) => {
    e.stopPropagation();
    setSelectedConvoy(convoy);
    setShowAddVehicleModal(true);
    setVehicleError('');
    setVehicleSuccess('');
    setVehicleForm({
      vehicleType: 'truck',
      registrationNumber: '',
      driverName: '',
      loadType: 'medical',
      loadWeight: '',
      capacity: ''
    });
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setVehicleError('');
    setVehicleSuccess('');

    if (!vehicleForm.registrationNumber || !vehicleForm.driverName || !vehicleForm.loadWeight || !vehicleForm.capacity) {
      setVehicleError('Please fill in all vehicle details');
      return;
    }

    setAddingVehicle(true);

    try {
      const token = localStorage.getItem('access_token');
      const payload = {
        vehicle_type: vehicleForm.vehicleType.toLowerCase(),
        registration_number: vehicleForm.registrationNumber,
        load_type: vehicleForm.loadType.toLowerCase(),
        load_weight_kg: parseFloat(vehicleForm.loadWeight),
        capacity_kg: parseFloat(vehicleForm.capacity),
        driver_name: vehicleForm.driverName,
        current_status: 'pending'
      };

      const res = await fetch(`http://localhost:8000/api/convoys/add-vehicle/${selectedConvoy.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Error: ${res.status}`);
      }

      const data = await res.json();
      setVehicleSuccess(`Vehicle ${vehicleForm.registrationNumber} added successfully!`);

      setTimeout(() => {
        setShowAddVehicleModal(false);
        fetchConvoys();
      }, 1500);
    } catch (err) {
      console.error('Add vehicle error:', err);
      setVehicleError(err.message || 'Failed to add vehicle');
    } finally {
      setAddingVehicle(false);
    }
  };

  const openDeleteConfirmModal = (convoy, e) => {
    e.stopPropagation();
    setConvoyToDelete(convoy);
    setDeleteConfirmModal(true);
  };

  const handleDeleteConvoy = async () => {
    if (!convoyToDelete) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/api/convoys/${convoyToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Error: ${res.status}`);
      }

      setDeleteConfirmModal(false);
      setConvoyToDelete(null);
      fetchConvoys();
    } catch (err) {
      console.error('Delete convoy error:', err);
      alert(err.message || 'Failed to delete convoy');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Convoy History</h1>
          <p className="text-slate-400">View and manage all convoys</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {priorities.map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm whitespace-nowrap ${
                filter === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Convoys Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-slate-400">
              Loading convoys...
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-400 mb-4">No convoys found</p>
              <button
                onClick={() => navigate('/create-convoy')}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                Create your first convoy →
              </button>
            </div>
          ) : (
            filtered.map((convoy) => {
              const isExpanded = expandedConvoys.has(convoy.id);
              const vehicles = convoyVehicles[convoy.id] || [];
              const isLoadingVehicles = loadingVehicles[convoy.id];

              return (
                <div
                  key={convoy.id}
                  className="bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3
                        onClick={() => navigate(`/route/${convoy.id}`)}
                        className="text-white font-semibold text-lg flex-1 cursor-pointer hover:text-blue-400 transition-colors"
                      >
                        {convoy.convoy_name}
                      </h3>
                      <div className={`px-3 py-1 rounded-full border text-xs font-medium ${getPriorityColor(convoy.priority)}`}>
                        {convoy.priority}
                      </div>
                    </div>

                    <div className="space-y-3 text-slate-400 text-sm mb-4">
                      <div className="bg-slate-900/50 rounded p-3 border border-slate-700">
                        <div className="text-xs text-slate-500 mb-1">Route</div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="font-medium text-green-400">{convoy.source?.place || 'Source'}</span>
                          <span className="text-slate-600">→</span>
                          <span className="font-medium text-red-400">{convoy.destination?.place || 'Destination'}</span>
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <span>Vehicles:</span>
                        <span className="text-white font-medium">{convoy.vehicle_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Load:</span>
                        <span className="text-white font-medium">{convoy.total_load_kg} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Convoy ID:</span>
                        <span className="text-white font-medium">#{convoy.id}</span>
                      </div>
                    </div>

                    {/* Vehicle Details Toggle */}
                    {convoy.vehicle_count > 0 && (
                      <button
                        onClick={() => toggleConvoyExpand(convoy.id)}
                        className="w-full mb-3 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Hide Vehicle Details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Show Vehicle Details ({convoy.vehicle_count})
                          </>
                        )}
                      </button>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => openAddVehicleModal(convoy, e)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add Vehicle
                      </button>
                      <button
                        onClick={(e) => openDeleteConfirmModal(convoy, e)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm"
                        title="Delete convoy"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Vehicle Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-700 p-6 bg-slate-900/30">
                      <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Vehicle Details
                      </h4>

                      {isLoadingVehicles ? (
                        <div className="text-center py-8 text-slate-400">Loading vehicles...</div>
                      ) : vehicles.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">No vehicles found</div>
                      ) : (
                        <div className="space-y-3">
                          {vehicles.map((vehicle, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-800 rounded-lg border border-slate-700 p-4 hover:border-slate-600 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Truck className="w-4 h-4 text-blue-400" />
                                  <span className="text-white font-semibold">{vehicle.registration}</span>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-medium ${getVehicleStatusColor(vehicle.status)}`}>
                                  {vehicle.status.replace('_', ' ').toUpperCase()}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2 text-slate-400">
                                  <User className="w-3 h-3" />
                                  <span>Driver: <span className="text-white">{vehicle.driver}</span></span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                  <Truck className="w-3 h-3" />
                                  <span>Type: <span className="text-white capitalize">{vehicle.type}</span></span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                  <Package className="w-3 h-3" />
                                  <span>Load: <span className="text-white capitalize">{vehicle.load_type}</span></span>
                                </div>
                                <div className="text-slate-400">
                                  Weight: <span className="text-white">{vehicle.load_kg}/{vehicle.capacity_kg} kg</span>
                                </div>
                              </div>

                              {/* Load Progress Bar */}
                              <div className="mt-3">
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, (vehicle.load_kg / vehicle.capacity_kg) * 100)}%` }}
                                  />
                                </div>
                                <div className="text-xs text-slate-400 mt-1 text-right">
                                  {((vehicle.load_kg / vehicle.capacity_kg) * 100).toFixed(1)}% capacity
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Add Vehicle Modal */}
      {showAddVehicleModal && selectedConvoy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Add Vehicle to Convoy</h2>
                <div className="text-sm text-slate-400">
                  <div className="mb-1">
                    <span className="font-medium text-white">{selectedConvoy.convoy_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-green-400">{selectedConvoy.source?.place}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-red-400">{selectedConvoy.destination?.place}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAddVehicleModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddVehicle} className="p-6">
              {vehicleError && (
                <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                  {vehicleError}
                </div>
              )}
              {vehicleSuccess && (
                <div className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
                  {vehicleSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Vehicle Type *</label>
                  <select
                    value={vehicleForm.vehicleType}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    {VEHICLE_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Registration Number *</label>
                  <input
                    type="text"
                    placeholder="e.g., DL-01-AB-1234"
                    value={vehicleForm.registrationNumber}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Driver Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Raj Kumar"
                    value={vehicleForm.driverName}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, driverName: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Load Type *</label>
                  <select
                    value={vehicleForm.loadType}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, loadType: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    {LOAD_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Load Weight (kg) *</label>
                  <input
                    type="number"
                    placeholder="e.g., 500"
                    value={vehicleForm.loadWeight}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, loadWeight: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Capacity (kg) *</label>
                  <input
                    type="number"
                    placeholder="e.g., 1000"
                    value={vehicleForm.capacity}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  disabled={addingVehicle}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
                >
                  {addingVehicle ? 'Adding...' : (
                    <>
                      <Plus className="w-5 h-5" />
                      Add Vehicle
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && convoyToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-red-500/30 max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Delete Convoy</h2>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4 mb-6 border border-slate-700">
              <p className="text-white font-medium mb-2">{convoyToDelete.convoy_name}</p>
              <div className="text-sm text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Convoy ID:</span>
                  <span className="text-white">#{convoyToDelete.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vehicles:</span>
                  <span className="text-white">{convoyToDelete.vehicle_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Load:</span>
                  <span className="text-white">{convoyToDelete.total_load_kg} kg</span>
                </div>
              </div>
            </div>

            <p className="text-slate-300 text-sm mb-6">
              Are you sure you want to delete this convoy? All associated vehicles and route data will be permanently removed.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteConvoy}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {deleting ? (
                  'Deleting...'
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Convoy
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setDeleteConfirmModal(false);
                  setConvoyToDelete(null);
                }}
                disabled={deleting}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
