import React, { useState, useEffect } from 'react';
import './DeptStep.css';
import { bookingApi } from '../../api/bookingApi';
import type { DepartmentSummary } from '../../types/booking.types';
import { departmentUiMeta, fallbackDepartmentMeta } from '../../data/departmentUiMeta';

interface DeptStepProps {
  hospitalId: number;
  onSelect: (deptId: number) => void;
  onBack: () => void;
}

export const DeptStep: React.FC<DeptStepProps> = ({ hospitalId, onSelect, onBack }) => {
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDepartments();
  }, [hospitalId]);

  const loadDepartments = async () => {
    try {
      const data = await bookingApi.getDepartments(hospitalId);
      setDepartments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dept-step">
      <button className="back-link" onClick={onBack}>
        ← Back to Action Selection
      </button>

      <div className="dept-header">
        <h2>Select a Department</h2>
        <p>Choose the medical specialty you need to consult.</p>
      </div>

      {loading ? (
        <p className="loading-text">Loading departments...</p>
      ) : departments.length === 0 ? (
        <div className="empty-state">No departments listed for this hospital.</div>
      ) : (
        <div className="dept-grid">
          {departments.map(dept => {
            const meta = departmentUiMeta[dept.conditionName] || fallbackDepartmentMeta;
            return (
              <div 
                key={dept.id} 
                className="dept-card"
                onClick={() => onSelect(dept.id)}
              >
                <div 
                  className="dept-icon-bg"
                  style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                >
                  {meta.icon}
                </div>
                <h3>{dept.conditionName}</h3>
                <div className="dept-arrow" style={{ color: meta.color }}>→</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
