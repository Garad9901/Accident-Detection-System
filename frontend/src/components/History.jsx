import React, { useState, useEffect } from 'react'
import { config } from '../config'
import axios from 'axios'
import { Table, Button, Input, Select, Modal, message, Tag } from 'antd'
import { 
  MdSearch, 
  MdFileDownload, 
  MdDeleteForever, 
  MdFilterList,
  MdImage,
  MdAccessTime
} from 'react-icons/md'

const { Option } = Select;

function History({ sourceFilter = null, accidentOnly = false }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState(sourceFilter || 'all');
  const [filterAccident, setFilterAccident] = useState(accidentOnly);
  
  // Image zoom modal
  const [zoomImage, setZoomImage] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [source, filterAccident, search]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (source !== 'all') params.source = source;
      if (filterAccident) params.accident_only = true;
      if (search) params.search = search;

      const response = await axios.get('/api/history', { params });
      setData(response.data);
    } catch (e) {
      console.error("Failed to load history list:", e);
      message.error("Failed to fetch historical database records.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Confirm Deletion',
      content: 'Are you sure you want to delete this detection record? This will permanently remove it and its associated snapshot image.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await axios.delete(`/api/history/${id}`);
          message.success("Record deleted successfully.");
          fetchHistory();
        } catch (e) {
          console.error("Failed to delete record:", e);
          message.error("Failed to delete record.");
        }
      }
    });
  };

  const handleExport = () => {
    window.open(`${config.backendHttpUrl}/api/history/download`, '_blank');
  };

  // Define table columns
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Date & Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      render: (text) => {
        const d = new Date(text);
        return (
          <span className="flex items-center gap-1.5 font-semibold text-slate-300 text-xs">
            <MdAccessTime className="text-slate-500" />
            {d.toLocaleDateString()} {d.toLocaleTimeString()}
          </span>
        );
      }
    },
    {
      title: 'Source Feed',
      dataIndex: 'source',
      key: 'source',
      render: (text) => (
        <span className="text-xs font-semibold text-slate-400">{text}</span>
      )
    },
    {
      title: 'Vehicles',
      key: 'vehicles',
      render: (_, record) => (
        <div className="text-xs space-y-0.5">
          <div className="font-bold text-white">Total: {record.vehicle_count}</div>
          <div className="text-[10px] text-slate-500 font-semibold">
            Cars: {record.car_count} | Bikes: {record.motorcycle_count} | Truck: {record.truck_count} | Bus: {record.bus_count}
          </div>
        </div>
      )
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (val) => (
        <span className="text-xs font-semibold text-slate-300">{(val * 100).toFixed(1)}%</span>
      )
    },
    {
      title: 'Alert Status',
      dataIndex: 'accident_detected',
      key: 'accident_detected',
      render: (isAccident) => (
        <Tag color={isAccident ? 'red' : 'green'} className="font-bold text-[10px] uppercase border px-2 py-0.5 rounded-full">
          {isAccident ? 'Accident Detected' : 'Safe Log'}
        </Tag>
      )
    },
    {
      title: 'Snapshot',
      dataIndex: 'image_path',
      key: 'image_path',
      render: (path) => {
        if (!path) return <span className="text-slate-600 text-[10px]">No Snapshot</span>;
        return (
          <Button 
            type="text" 
            icon={<MdImage size={18} />} 
            onClick={() => setZoomImage(`${config.backendHttpUrl}/api/uploads/${path}`)}
            className="text-indigo-400 hover:text-indigo-300 p-0 flex items-center"
          >
            View
          </Button>
        );
      }
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button 
          type="text" 
          danger 
          icon={<MdDeleteForever size={20} />} 
          onClick={() => handleDelete(record.id)}
          className="hover:scale-105 transition-all p-0 flex items-center justify-center text-rose-500 hover:text-rose-400"
        />
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12 select-none">
      
      {/* Filtering Control Row */}
      <div className="glass-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Search bar */}
          <Input 
            placeholder="Search records..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<MdSearch className="text-slate-400" size={18} />}
            className="w-full md:w-60 bg-black/20 hover:bg-black/30 text-white placeholder:text-slate-500 border-white/10 rounded-xl py-2 px-3 focus:border-indigo-500"
          />

          {/* Source dropdown */}
          <Select 
            value={source} 
            onChange={(val) => setSource(val)}
            className="w-full md:w-44"
            dropdownClassName="bg-slate-900 border border-white/10"
          >
            <Option value="all">All Sources</Option>
            <Option value="Upload Video">Upload Videos</Option>
            <Option value="Live Webcam">Live Webcams</Option>
          </Select>

          {/* Accident Toggle */}
          <button 
            onClick={() => setFilterAccident(prev => !prev)}
            className={`px-4 py-2 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              filterAccident 
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 font-extrabold' 
                : 'bg-white/5 text-slate-400 border-white/5 hover:text-slate-200'
            }`}
          >
            <MdFilterList /> Accidents Only
          </button>
        </div>

        <Button 
          type="primary" 
          onClick={handleExport}
          icon={<MdFileDownload size={18} className="inline mr-1" />}
          className="bg-indigo-600 hover:bg-indigo-500 border-none text-xs font-bold rounded-xl py-5 flex items-center justify-center shadow-lg hover:shadow-indigo-500/20"
        >
          Export CSV Database
        </Button>
      </div>

      {/* History table list */}
      <div className="glass-card p-6 overflow-hidden">
        <Table 
          dataSource={data} 
          columns={columns} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          className="border border-white/5 rounded-xl overflow-hidden"
        />
      </div>

      {/* Screenshot Zoom Modal */}
      <Modal
        visible={!!zoomImage}
        onCancel={() => setZoomImage(null)}
        footer={null}
        width={720}
        centered
        className="glass-panel"
      >
        {zoomImage && (
          <img 
            src={zoomImage} 
            alt="Event Snapshot Zoom" 
            className="w-full h-auto object-contain rounded-lg border border-white/10 shadow-2xl mt-4" 
          />
        )}
      </Modal>

    </div>
  )
}

export default History
