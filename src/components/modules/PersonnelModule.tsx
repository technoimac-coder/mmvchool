'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserAssignment } from '../../types';
import { adminApi, ApiError } from '../../lib/api';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Briefcase,
  Edit,
  Trash2,
  Download,
  Camera,
  X,
  Layers,
  Upload,
  Check
} from 'lucide-react';

export const PersonnelModule: React.FC = () => {
  const { users, updateUser, setUsersList, currentUser, addToast } = useApp();
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'director';

  // 16 exact categories from screenshots
  const categories = [
    'คณะผู้บริหาร',
    'กลุ่มสาระการเรียนรู้ภาษาไทย',
    'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
    'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
    'กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนาและวัฒนธรรม',
    'กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา',
    'กลุ่มสาระการเรียนรู้ศิลปะ',
    'กลุ่มสาระการเรียนรู้การงานอาชีพ',
    'กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ',
    'กลุ่มงาน English Program',
    'งานแนะแนว',
    'งานห้องสมุด',
    'งานนักเรียนประจำ',
    'ลูกจ้างประจำ',
    'เจ้าหน้าที่สนับสนุนการสอน',
    'พนักงานขับรถ'
  ];

  // Comprehensive pre-seeded mock dataset with authentic Thai educator names, real positions, head roles, and photos
  const [personnelList, setPersonnelList] = useState<User[]>(users);

  // Keep local personnelList in sync with global users list from AppContext when it resolves from server
  useEffect(() => {
    // eslint-disable-next-line
    setPersonnelList(users);
  }, [users]);
  const [oldList] = useState<User[]>([
    // คณะผู้บริหาร
    {
      id: 'MMV-01',
      name: 'นางสาวมณฑาทิพย์ เสาวคนธ์',
      position: 'ผู้อำนวยการ ชำนาญการพิเศษ',
      department: 'คณะผู้บริหาร',
      role: 'director',
      avatar: 'ม',
      email: 'director@mmv.ac.th',
      phone: '081-992-1101',
      organization: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80',
      assignments: [{ role: 'ผู้อำนวยการสถานศึกษา', description: 'บริหารงานโรงเรียนในภาพรวมทุกกลุ่มงาน' }],
      leaveQuota: { sick: 30, personal: 15 },
      leaveUsed: { sick: 0, personal: 0 },
      leaveCount: { sick: 0, personal: 0 }
    },
    {
      id: 'MMV-02',
      name: 'นางสาวอรชุมา วงศ์ช่าง',
      position: 'รองผู้อำนวยการ ชำนาญการพิเศษ',
      department: 'คณะผู้บริหาร',
      role: 'deputy_personnel',
      avatar: 'อ',
      email: 'orchuma@mmv.ac.th',
      phone: '081-992-1102',
      organization: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
      photoUrl: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=500&auto=format&fit=crop&q=80',
      assignments: [{ role: 'รองผู้อำนวยการฝ่ายวิชาการ', description: 'บริหารงานกลุ่มงานวิชาการและการจัดการเรียนรู้' }],
      leaveQuota: { sick: 30, personal: 15 },
      leaveUsed: { sick: 0, personal: 0 },
      leaveCount: { sick: 0, personal: 0 }
    },
    {
      id: 'MMV-03',
      name: 'นายไชยวัฒน์ บุญมี',
      position: 'รองผู้อำนวยการ ชำนาญการพิเศษ',
      department: 'คณะผู้บริหาร',
      role: 'deputy_budget',
      avatar: 'ไ',
      email: 'chaiwat@mmv.ac.th',
      phone: '081-992-1103',
      organization: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
      photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&auto=format&fit=crop&q=80',
      assignments: [{ role: 'รองผู้อำนวยการฝ่ายบริหารทั่วไป', description: 'บริหารงานอาคารสถานที่ ยานพาหนะ และบริการ' }],
      leaveQuota: { sick: 30, personal: 15 },
      leaveUsed: { sick: 0, personal: 0 },
      leaveCount: { sick: 0, personal: 0 }
    },
    {
      id: 'MMV-04',
      name: 'นางสาวสุรียาพร นพกรเศรษฐกุล',
      position: 'รองผู้อำนวยการ ชำนาญการ',
      department: 'คณะผู้บริหาร',
      role: 'deputy_budget',
      avatar: 'ส',
      email: 'sureeyaporn@mmv.ac.th',
      phone: '081-992-1104',
      organization: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
      photoUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500&auto=format&fit=crop&q=80',
      assignments: [{ role: 'รองผู้อำนวยการฝ่ายงบประมาณ, ฝ่ายบุคคล', description: 'บริหารงานงบประมาณ แผนงาน และบริหารงานบุคคล' }],
      leaveQuota: { sick: 30, personal: 15 },
      leaveUsed: { sick: 0, personal: 0 },
      leaveCount: { sick: 0, personal: 0 }
    },

    // ภาษาไทย
    {
      id: 'MMV-10',
      name: 'นางสาวรัญชิตวดี ธนากูลจิรพันธ์',
      position: 'ครูชำนาญการพิเศษ',
      department: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
      role: 'head',
      avatar: 'ร',
      email: 'ranchitwadee@mmv.ac.th',
      phone: '084-555-0101',
      organization: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
      photoUrl: 'https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?w=500&auto=format&fit=crop&q=80',
      assignments: [{ role: 'หัวหน้ากลุ่มสาระการเรียนรู้ภาษาไทย', description: 'กำกับดูแลงานวิชาการกลุ่มสาระภาษาไทย' }],
      leaveQuota: { sick: 30, personal: 15 },
      leaveUsed: { sick: 0, personal: 0 },
      leaveCount: { sick: 0, personal: 0 }
    },
    {
      id: 'MMV-11',
      name: 'นางขนิษฐา เนตรนิยม',
      position: 'ครูชำนาญการ',
      department: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
      role: 'teacher',
      avatar: 'ข',
      email: 'khanittha@mmv.ac.th',
      phone: '084-555-0102',
      organization: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80',
      assignments: [{ role: 'ครูประจำชั้น ม.2/1', description: 'ดูแลนักเรียนประจำชั้น' }],
      leaveQuota: { sick: 30, personal: 15 },
      leaveUsed: { sick: 0, personal: 0 },
      leaveCount: { sick: 0, personal: 0 }
    },
    {
      id: 'MMV-12',
      name: 'นางสาวเกศินกุล มีศรี',
      position: 'ครูชำนาญการ',
      department: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
      role: 'teacher',
      avatar: 'เ',
      email: 'kesinkul@mmv.ac.th',
      phone: '084-555-0103',
      organization: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
      photoUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=500&auto=format&fit=crop&q=80',
      assignments: [{ role: 'งานห้องสมุดภาษาไทย', description: 'ดูแลส่งเสริมนิสัยรักการอ่าน' }],
      leaveQuota: { sick: 30, personal: 15 },
      leaveUsed: { sick: 0, personal: 0 },
      leaveCount: { sick: 0, personal: 0 }
    },
    {
      id: 'MMV-13',
      name: 'นางสาวพนิดา เสายอด',
      position: 'ครู',
      department: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
      role: 'teacher',
      avatar: 'พ',
      email: 'panida@mmv.ac.th',
      phone: '084-555-0104',
      organization: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
      assignments: [{ role: 'กรรมการประเมิน ว.PA ภาษาไทย', description: 'งานประกันคุณภาพภายใน' }],
      leaveQuota: { sick: 30, personal: 15 },
      leaveUsed: { sick: 0, personal: 0 },
      leaveCount: { sick: 0, personal: 0 }
    },
    {
      id: 'MMV-14',
      name: 'นางสาวมนัสศิการ ควางบ้าน',
      position: 'ครูผู้ช่วย',
      department: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
      role: 'teacher',
      avatar: 'ม',
      email: 'manatsikarn@mmv.ac.th',
      phone: '084-555-0105',
      organization: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
      photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
      assignments: [{ role: 'งานชุมนุมวรรณศิลป์', description: 'กิจกรรมพัฒนาผู้เรียน' }],
      leaveQuota: { sick: 30, personal: 15 },
      leaveUsed: { sick: 0, personal: 0 },
      leaveCount: { sick: 0, personal: 0 }
    },

    // กลุ่มงาน English Program
    {
      id: 'MMV-20',
      name: 'นางสาวปาริชาต บุญมี',
      position: 'ครูชำนาญการพิเศษ',
      department: 'กลุ่มงาน English Program',
      role: 'head',
      avatar: 'ป',
      email: 'parichat@mmv.ac.th',
      phone: '089-112-2201',
      organization: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80',
      assignments: [{ role: 'หัวหน้ากลุ่มงาน English Program', description: 'กำกับดูแลหลักสูตร English Program' }],
      leaveQuota: { sick: 30, personal: 15 },
      leaveUsed: { sick: 0, personal: 0 },
      leaveCount: { sick: 0, personal: 0 }
    },
    {
      id: 'MMV-21',
      name: 'นางสาวชญานี ไกรสมุทร',
      position: 'ครูชำนาญการ',
      department: 'กลุ่มงาน English Program',
      role: 'teacher',
      avatar: 'ช',
      email: 'chayani@mmv.ac.th',
      phone: '089-112-2202',
      organization: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
      photoUrl: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=500&auto=format&fit=crop&q=80',
      assignments: [{ role: 'ครูผู้สอน EP Science', description: 'การสอนหลักสูตรสองภาษา' }],
      leaveQuota: { sick: 30, personal: 15 },
      leaveUsed: { sick: 0, personal: 0 },
      leaveCount: { sick: 0, personal: 0 }
    },
    {
      id: 'MMV-22',
      name: 'นายโนยมินมาน เนตรสังข์',
      position: 'ครู',
      department: 'กลุ่มงาน English Program',
      role: 'teacher',
      avatar: 'น',
      email: 'noyminman@mmv.ac.th',
      phone: '089-112-2203',
      organization: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
      assignments: [{ role: 'ครูผู้สอน EP Mathematics', description: 'วิทยากรติวเข้มโอลิมปิกวิชาการ' }],
      leaveQuota: { sick: 30, personal: 15 },
      leaveUsed: { sick: 0, personal: 0 },
      leaveCount: { sick: 0, personal: 0 }
    },
    {
      id: 'MMV-23',
      name: 'นายชิตพล ปฏิสังข์',
      position: 'ครู',
      department: 'กลุ่มงาน English Program',
      role: 'teacher',
      avatar: 'ช',
      email: 'chitpol@mmv.ac.th',
      phone: '089-112-2204',
      organization: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
      assignments: [{ role: 'ผู้ประสานงานครูชาวต่างชาติ', description: 'ดูแลงานวิชาการครูต่างประเทศ' }],
      leaveQuota: { sick: 30, personal: 15 },
      leaveUsed: { sick: 0, personal: 0 },
      leaveCount: { sick: 0, personal: 0 }
    },

    // คณิตศาสตร์
    {
      id: 'MMV-30',
      name: 'นายสมเกียรติ มั่นคง',
      position: 'ครูชำนาญการพิเศษ',
      department: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
      role: 'head',
      avatar: 'ส',
      email: 'somkiat@mmv.ac.th',
      phone: '081-333-4401',
      organization: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
      photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop&q=80',
      assignments: [{ role: 'หัวหน้ากลุ่มสาระการเรียนรู้คณิตศาสตร์', description: 'กำกับงานวิชาการกลุ่มสาระคณิตศาสตร์' }],
      leaveQuota: { sick: 30, personal: 15 },
      leaveUsed: { sick: 0, personal: 0 },
      leaveCount: { sick: 0, personal: 0 }
    },
    {
      id: 'MMV-31',
      name: 'นางสมศรี มีสุข',
      position: 'ครูชำนาญการ',
      department: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
      role: 'teacher',
      avatar: 'ส',
      email: 'somsri@mmv.ac.th',
      phone: '081-333-4402',
      organization: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80',
      assignments: [{ role: 'ครูผู้สอนคณิตศาสตร์ ม.3', description: 'กรรมการชุมนุมคณิตศาสตร์' }],
      leaveQuota: { sick: 30, personal: 15 },
      leaveUsed: { sick: 0, personal: 0 },
      leaveCount: { sick: 0, personal: 0 }
    },
    {
      id: 'MMV-32',
      name: 'นายวิชัย ก้าวหน้า',
      position: 'ครู',
      department: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
      role: 'teacher',
      avatar: 'ว',
      email: 'wichai@mmv.ac.th',
      phone: '081-333-4403',
      organization: 'โรงเรียนมกุฎเมืองราชวิทยาลัย',
      photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&auto=format&fit=crop&q=80',
      assignments: [{ role: 'ครูผู้สอนคณิตศาสตร์ ม.2', description: 'งานวัดและประเมินผล' }],
      leaveQuota: { sick: 30, personal: 15 },
      leaveUsed: { sick: 0, personal: 0 },
      leaveCount: { sick: 0, personal: 0 }
    }
  ]);

  const [activeCategory, setActiveCategory] = useState<string>('คณะผู้บริหาร');
  const [selectedPerson, setSelectedPerson] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Bulk Photo Upload State
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<Array<{ file: File; previewUrl: string; matchedUserId: string; filename: string }>>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Auto match photo filename to teacher by ID (e.g. MMV01, MMV11, 01, 11) or Name
  const matchPhotoToUser = (filename: string): string => {
    const cleanName = filename.toLowerCase().replace(/\.[^/.]+$/, '').trim();
    
    // 1. Direct ID match (e.g. mmv01, mmv11, mmv-01)
    const normalizedId = cleanName.replace(/[^a-z0-9]/g, '');
    const userById = personnelList.find(p => {
      const pIdNorm = p.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      return pIdNorm === normalizedId || pIdNorm === `mmv${normalizedId}` || normalizedId === `mmv${pIdNorm}`;
    });
    if (userById) return userById.id;

    // 2. Numeric match (e.g. 1 -> MMV01, 11 -> MMV11)
    if (/^\d+$/.test(cleanName)) {
      const numStr = String(parseInt(cleanName, 10)).padStart(2, '0');
      const userByNum = personnelList.find(p => p.id.endsWith(numStr) || p.id === `MMV${numStr}`);
      if (userByNum) return userByNum.id;
    }

    // 3. Name match (Thai substring in full name)
    const userByName = personnelList.find(p => {
      const cleanThai = p.name.replace(/^(นาย|นางสาว|นาง|ครู|ดร\.)\s*/, '');
      return cleanName.includes(cleanThai) || cleanThai.includes(cleanName) || p.name.includes(cleanName);
    });
    if (userByName) return userByName.id;

    return '';
  };

  const handleBulkFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingBulk(true);
    const newItems: Array<{ file: File; previewUrl: string; matchedUserId: string; filename: string }> = [];

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const matchedUserId = matchPhotoToUser(file.name);
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        file,
        previewUrl,
        matchedUserId,
        filename: file.name
      });
    });

    setBulkFiles(prev => [...prev, ...newItems]);
    setIsProcessingBulk(false);
    setShowBulkUploadModal(true);
  };

  const handleBulkReassign = (index: number, newUserId: string) => {
    setBulkFiles(prev => {
      const updated = [...prev];
      updated[index].matchedUserId = newUserId;
      return updated;
    });
  };

  const handleBulkRemoveItem = (index: number) => {
    setBulkFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveBulkPhotos = async () => {
    setIsProcessingBulk(true);
    const photoMap: { [userId: string]: string } = {};

    for (const item of bulkFiles) {
      if (!item.matchedUserId) continue;
      // Convert file to Base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(item.file);
      });
      photoMap[item.matchedUserId] = base64;
    }

    try {
      await adminApi.bulkUpdatePhotos(photoMap);

      setPersonnelList(prev => {
        const next = prev.map(p => {
          if (photoMap[p.id]) {
            return { ...p, photoUrl: photoMap[p.id] };
          }
          return p;
        });
        setUsersList(next);
        return next;
      });

      alert(`อัปเดตรูปถ่ายบุคลากรสำเร็จ ${Object.keys(photoMap).length} ท่าน!`);
      setShowBulkUploadModal(false);
      setBulkFiles([]);
    } catch (error) {
      alert(error instanceof ApiError ? error.message : 'อัปโหลดรูปภาพล้มเหลว');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Edit form state
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    position: 'ครู',
    department: 'คณะผู้บริหาร',
    role: 'teacher',
    phone: '',
    photoUrl: '',
    assignments: [],
    leaveQuota: { sick: 30, personal: 15 }
  });

  const [newAssignmentGroup, setNewAssignmentGroup] = useState('กลุ่มบริหารวิชาการ');
  const [newAssignmentRole, setNewAssignmentRole] = useState('');
  const [newAssignmentDesc, setNewAssignmentDesc] = useState('');
  const [newAssignmentOrder, setNewAssignmentOrder] = useState('');

  // Filter members by active category (Supports Dual/Multiple Group Assignments)
  const unsortedActiveMembers = personnelList.filter(p => {
    const assignments = p.assignments || [];
    const dept = p.department || '';
    const pos = p.position || '';

    if (activeCategory === 'คณะผู้บริหาร') {
      return dept === 'คณะผู้บริหาร' || p.role === 'director' || p.role.startsWith('deputy') || pos.includes('ผู้อำนวยการ');
    }

    if (activeCategory === 'กลุ่มงาน English Program') {
      const isEPDept = (dept.includes('English') || dept.includes('EP')) && !dept.includes('IEP') && !dept.toLowerCase().includes('iep');
      const hasEPAssign = assignments.some(a => 
        (a.role && (a.role.includes('English Program') || a.role.includes('EP')) && !a.role.includes('IEP')) ||
        (a.description && a.description.includes('English Program')) ||
        (a.group && a.group.includes('English Program')) ||
        (a.duty && (a.duty.includes('English Program') || a.duty.includes('EP')) && !a.duty.includes('IEP') && !a.duty.toLowerCase().includes('iep'))
      );
      return isEPDept || hasEPAssign;
    }

    if (activeCategory === 'งานแนะแนว') {
      const isGuideDept = dept.includes('แนะแนว') || dept.includes('กิจกรรมพัฒนาผู้เรียน');
      const hasGuideAssign = assignments.some(a => 
        (a.role && a.role.includes('แนะแนว')) || 
        (a.description && a.description.includes('แนะแนว')) ||
        (a.group && a.group.includes('แนะแนว')) ||
        (a.duty && a.duty.includes('แนะแนว'))
      );
      return isGuideDept || hasGuideAssign;
    }

    if (activeCategory === 'งานห้องสมุด') {
      const isLibDept = dept.includes('ห้องสมุด');
      const hasLibAssign = assignments.some(a => 
        (a.role && a.role.includes('ห้องสมุด')) || 
        (a.description && a.description.includes('ห้องสมุด')) ||
        (a.group && a.group.includes('ห้องสมุด')) ||
        (a.duty && a.duty.includes('ห้องสมุด'))
      );
      return isLibDept || hasLibAssign;
    }

    if (activeCategory === 'งานนักเรียนประจำ') {
      const isBoardingDept = dept.includes('นักเรียนประจำ') || dept.includes('หอพัก');
      const hasBoardingAssign = assignments.some(a => 
        (a.role && (a.role.includes('นักเรียนประจำ') || a.role.includes('หอพัก'))) || 
        (a.description && a.description.includes('นักเรียนประจำ')) ||
        (a.group && (a.group.includes('นักเรียนประจำ') || a.group.includes('หอพัก'))) ||
        (a.duty && (a.duty.includes('นักเรียนประจำ') || a.duty.includes('หอพัก')))
      );
      return isBoardingDept || hasBoardingAssign;
    }

    if (activeCategory === 'ลูกจ้างประจำ') {
      return pos.includes('ลูกจ้างประจำ') || dept.includes('ลูกจ้างประจำ') || p.role === 'technician';
    }

    if (activeCategory === 'เจ้าหน้าที่สนับสนุนการสอน') {
      return pos.includes('เจ้าหน้าที่') || pos.includes('ธุรการ') || dept.includes('สนับสนุน') || p.role === 'technician';
    }

    if (activeCategory === 'พนักงานขับรถ') {
      return p.role === 'driver' || pos.includes('ขับรถ') || dept.includes('ขับรถ');
    }

    // 8 Learning Subject Groups
    const cleanSubj = activeCategory.replace('กลุ่มสาระการเรียนรู้', '').replace('กลุ่มสาระฯ', '').trim();
    const isMainDept = dept.includes(cleanSubj);
    const hasSubjAssign = assignments.some(a => 
      (a.role && a.role.includes(cleanSubj)) || 
      (a.group && a.group.includes(cleanSubj)) ||
      (a.description && a.description.includes(cleanSubj)) ||
      (a.duty && a.duty.includes(cleanSubj))
    );

    return isMainDept || hasSubjAssign;
  });

  // Always show personnel by numeric ID (MMV01 ... MMV100), never by title.
  const activeMembers = [...unsortedActiveMembers].sort((a, b) => {
    const numberOf = (id: string) => Number(id.match(/\d+/)?.[0] ?? 999999);
    const byNumber = numberOf(a.id) - numberOf(b.id);
    return byNumber !== 0 ? byNumber : a.name.localeCompare(b.name, 'th');
  });

  // Identify Department Head / Director strictly for the active category
  const isExecutiveCategory = activeCategory === 'คณะผู้บริหาร';

  const findHeadOfCategory = (members: User[]) => {
    // Staff / Driver / Support groups have NO Head of Department (แสดงเรียงแถวเท่ากันทุกคน)
    if (
      activeCategory === 'เจ้าหน้าที่สนับสนุนการสอน' ||
      activeCategory === 'พนักงานขับรถ' ||
      activeCategory === 'ลูกจ้างประจำ'
    ) {
      return null;
    }

    if (isExecutiveCategory) {
      return members.find(p => p.role === 'director' || (p.position.includes('ผู้อำนวยการ') && !p.position.includes('รอง')));
    }

    const cleanCat = activeCategory.replace(/^(กลุ่มสาระการเรียนรู้|กลุ่มสาระฯ|กลุ่มงาน|งาน)\s*/, '').trim();
    
    // Priority 1: Check if teacher has exact Head role/duty for this active category in assignments
    const exactHead = members.find(p => 
      p.assignments?.some(a => {
        const roles = (a.role || '').split(';').map(r => r.trim());
        const duties = (a.duty || '').split(';').map(d => d.trim());
        const matchesRole = roles.some(r => r.includes('หัวหน้า') && r.includes(cleanCat));
        const matchesDuty = duties.some(d => d.includes('หัวหน้า') && d.includes(cleanCat));
        return matchesRole || matchesDuty;
      })
    );
    if (exactHead) return exactHead;

    // Priority 2: In English Program specifically, check EP Head (excluding IEP)
    if (activeCategory.includes('English Program')) {
      const epHead = members.find(p => 
        p.assignments?.some(a => {
          const roles = (a.role || '').split(';').map(r => r.trim());
          const duties = (a.duty || '').split(';').map(d => d.trim());
          const matchesRole = roles.some(r => r.includes('English Program') && r.includes('หัวหน้า') && !r.includes('IEP'));
          const matchesDuty = duties.some(d => d.includes('English Program') && d.includes('หัวหน้า') && !d.includes('IEP'));
          return matchesRole || matchesDuty;
        })
      );
      if (epHead) return epHead;
    }

    // Priority 3: Fallback to any teacher who has an assignment as Head of this specific category
    const deptHead = members.find(p => 
      p.assignments?.some(a => {
        const roles = (a.role || '').split(';').map(r => r.trim());
        const duties = (a.duty || '').split(';').map(d => d.trim());
        const matchesRole = roles.some(r => r.includes('หัวหน้า') && a.group && a.group.includes(cleanCat));
        const matchesDuty = duties.some(d => d.includes('หัวหน้า') && a.group && a.group.includes(cleanCat));
        return matchesRole || matchesDuty;
      })
    );
    if (deptHead) return deptHead;

    // Return null if no explicit head is found for this department
    return null;
  };

  const topLeader = findHeadOfCategory(activeMembers);
  const regularMembers = activeMembers.filter(p => p.id !== topLeader?.id);

  const getLeaderRoleLabel = (person: User) => {
    if (isExecutiveCategory) {
      return 'ผู้อำนวยการสถานศึกษา';
    }
    // Always return the full, exact title matching the activeCategory!
    // E.g., "หัวหน้ากลุ่มสาระการเรียนรู้คณิตศาสตร์", "หัวหน้ากลุ่มงาน English Program", "หัวหน้างานนักเรียนประจำ"
    return `หัวหน้า${activeCategory}`;
  };

  const handleOpenAdd = () => {
    setIsNew(true);
    setFormData({
      id: `MMV${String(personnelList.length + 1).padStart(2, '0')}`,
      name: '',
      email: '',
      position: 'ครู',
      department: activeCategory,
      role: 'teacher',
      phone: '',
      photoUrl: '',
      citizenId: '',
      assignments: [],
      leaveQuota: { sick: 30, personal: 15 }
    });
    setNewAssignmentRole('');
    setNewAssignmentDesc('');
    setNewAssignmentOrder('');
    setShowEditModal(true);
  };

  const handleOpenEdit = (person: User) => {
    setIsNew(false);
    setFormData({
      ...person,
      citizenId: '*************',
      assignments: person.assignments ? [...person.assignments] : []
    });
    setNewAssignmentRole('');
    setNewAssignmentDesc('');
    setNewAssignmentOrder('');
    setShowEditModal(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData(prev => ({ ...prev, photoUrl: event.target?.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddAssignment = () => {
    if (!newAssignmentRole.trim()) return;
    const currentAssignments = formData.assignments || [];
    setFormData(prev => ({
      ...prev,
      assignments: [
        ...currentAssignments,
        {
          group: newAssignmentGroup || 'กลุ่มบริหารวิชาการ',
          role: newAssignmentRole.trim(),
          description: newAssignmentDesc.trim() || undefined,
          orderNo: newAssignmentOrder.trim() || undefined
        }
      ]
    }));
    setNewAssignmentRole('');
    setNewAssignmentDesc('');
    setNewAssignmentOrder('');
  };

  // Helper to group assignments by Major Division (กลุ่มบริหารงานใหญ่)
  const groupAssignmentsByDivision = (assignments: UserAssignment[] = []) => {
    const groups: { [key: string]: UserAssignment[] } = {};
    assignments.forEach(a => {
      let gName = a.group || (a.description?.startsWith('กลุ่มงาน') ? a.description.replace('กลุ่มงาน', '') : 'งานทั่วไป / ภารกิจพิเศษ');
      if (!gName.trim()) gName = 'งานทั่วไป / ภารกิจพิเศษ';
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(a);
    });
    return groups;
  };

  const handleRemoveAssignment = (index: number) => {
    const currentAssignments = formData.assignments || [];
    setFormData(prev => ({
      ...prev,
      assignments: currentAssignments.filter((_, idx) => idx !== index)
    }));
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const updated = {
      ...formData,
      id: formData.id || `MMV${Date.now()}`
    } as User;

    try {
      const savedUser = await adminApi.updateUser(updated);
      if (isNew) {
        setPersonnelList(prev => {
          const next = [...prev, savedUser];
          setUsersList(next);
          return next;
        });
      } else {
        setPersonnelList(prev => {
          const next = prev.map(p => p.id === formData.id ? savedUser : p);
          setUsersList(next);
          return next;
        });
      }
      updateUser(savedUser);
      const credentialMessage = isNew && (savedUser as User & { loginCitizenId?: string }).loginCitizenId
        ? `บันทึกแล้ว — เข้าสู่ระบบด้วยเลขประจำตัว ${ (savedUser as User & { loginCitizenId: string }).loginCitizenId } และรหัส Password@123 จากนั้นระบบจะให้เปลี่ยนรหัสผ่าน`
        : 'บันทึกข้อมูลลงฐานข้อมูลเรียบร้อยแล้ว';
      addToast(isNew ? credentialMessage : 'แก้ไขข้อมูลบุคลากรเรียบร้อยแล้ว', 'success');
      setSaveStatus({ type: 'success', message: credentialMessage });
      window.setTimeout(() => setShowEditModal(false), 1800);
    } catch (error) {
      setSaveStatus({ type: 'error', message: error instanceof ApiError ? error.message : 'บันทึกข้อมูลไม่สำเร็จ' });
      addToast(error instanceof ApiError ? error.message : 'บันทึกข้อมูลบุคลากรไม่สำเร็จ', 'error');
    }
  };

  const handleDeletePerson = async () => {
    if (!formData.id) return;
    if (!window.confirm(`⚠️ คุณต้องการลบหรือบันทึกสถานะ "ลาออก" ของ ${formData.name} และนำชื่อออกจากทำเนียบบุคลากรโรงเรียนใช่หรือไม่?`)) {
      return;
    }

    try {
      await adminApi.deleteUser(formData.id);
      setPersonnelList(prev => prev.filter(p => p.id !== formData.id));
      setUsersList(users.filter(u => u.id !== formData.id));
      addToast(`บันทึกข้อมูลการลาออกของ ${formData.name} เรียบร้อยแล้ว`, 'success');
      setShowEditModal(false);
    } catch (error) {
      addToast(error instanceof ApiError ? error.message : 'ไม่สามารถลบข้อมูลบุคลากรได้', 'error');
    }
  };

  // Render Portrait Card matching screenshots (Clean Display)
  const renderCard = (person: User, isTopLeader: boolean = false) => {
    const leaderTitle = getLeaderRoleLabel(person);
    const initialChar = person.name.replace(/^(นาย|นางสาว|นาง|ครู|ดร\.|ว่าที่\s*ร้อยตรี\s*หญิง|ว่าที่\s*ร้อยตรี|ว่าที่\s*ร\.ต\.\s*หญิง|ว่าที่\s*ร\.ต\.)\s*/, '').slice(0, 1) || 'ม';
    return (
      <div
        key={person.id}
        className={`bg-white rounded-3xl p-5 border border-[#dbe4f0] shadow-xs hover:shadow-md transition-all flex flex-col items-center text-center justify-between group ${
          isTopLeader ? 'w-full max-w-xs' : 'w-full'
        }`}
      >
        <div className="w-full flex flex-col items-center space-y-2.5">
          {/* Photo Frame (Blue background portrait photo) */}
          <div className="relative w-28 h-36 rounded-2xl overflow-hidden bg-gradient-to-b from-[#1b4378] to-[#102a4e] p-0.5 shadow-inner shrink-0">
            {person.photoUrl ? (
              <img
                src={person.photoUrl}
                alt={person.name}
                className="w-full h-full object-cover rounded-[14px]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white">
                <span className="text-3xl font-extrabold">{initialChar}</span>
                <span className="text-[10px] text-blue-200 mt-1">ไม่มีรูปถ่าย</span>
              </div>
            )}
          </div>

          {/* Name & Academic Rank */}
          <div className="w-full space-y-0.5">
            <h3 className="font-extrabold text-[#0b1f3a] text-xs lg:text-sm tracking-tight leading-snug">
              {person.name}
            </h3>
            <p className="text-xs font-bold text-blue-900 leading-tight">
              {person.position}
            </p>
            
            {/* Leadership Role in Orange/Gold ONLY FOR TOP LEADER */}
            {isTopLeader && (
              <p className="text-[11px] font-bold text-amber-700 leading-tight pt-0.5">
                {leaderTitle}
              </p>
            )}

            {/* Department Label ONLY */}
            <p className="text-[11px] text-slate-400 font-medium pt-0.5">
              {person.department}
            </p>
          </div>
        </div>

        {/* View / Edit Button */}
        <div className="pt-3 w-full">
          <button
            onClick={() => handleOpenEdit(person)}
            className="w-full py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-900 border border-slate-200 text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
          >
            <Edit className="w-3 h-3" />
            <span>{isAdmin ? 'ดูและแก้ไขข้อมูล' : 'ดูข้อมูลบุคลากร'}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-[#dbe4f0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg lg:text-xl font-extrabold text-[#0b1f3a] tracking-tight">
            จัดการบัญชีบุคลากร ({personnelList.length} ท่าน)
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            โรงเรียนมกุฎเมืองราชวิทยาลัย · ข้อมูลจากฐานข้อมูล users
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors">
              <Camera className="w-3.5 h-3.5 text-emerald-700" />
              <span>📸 อัปโหลดรูปหลายคนพร้อมกัน</span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleBulkFilesSelect}
              />
            </label>
          )}
          <button
            onClick={() => alert('จำลองการส่งออกไฟล์ข้อมูลบุคลากร Excel')}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>ส่งออก Excel</span>
          </button>
          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 rounded-xl bg-[#0b1f3a] hover:bg-[#153a66] text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ เพิ่มบุคลากร</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Split Area: Left Sidebar (Categories) & Right Showcase (Top Center Leader + Member Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 4 Cols: Category Sidebar */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-3 border border-[#dbe4f0] shadow-xs space-y-2">
          <div className="px-4 py-2.5 rounded-2xl bg-[#0b1f3a] text-white font-extrabold text-xs tracking-wide text-center shadow-xs">
            ฝ่ายบริหารและบุคลากร
          </div>

          <div className="space-y-0.5 pt-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-50 text-[#0b1f3a] font-extrabold border-l-4 border-[#0b1f3a] shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className={`text-[9px] ${isActive ? 'text-[#0b1f3a]' : 'text-slate-400'}`}>•</span>
                  <span className="truncate">{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 8 Cols: Showcase Hierarchy */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-[#dbe4f0] shadow-xs space-y-6">
          {/* Group Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <p className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider">
                PERSONNEL GROUP
              </p>
              <h2 className="text-lg lg:text-xl font-extrabold text-[#0b1f3a] tracking-tight">
                {activeCategory}
              </h2>
              <p className="text-xs text-slate-400 font-normal">
                ข้อมูลบุคลากรตามทะเบียนกลางของโรงเรียน
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-[#0b1f3a] font-bold text-xs border border-blue-200">
              {activeMembers.length} คน
            </span>
          </div>

          {activeMembers.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 space-y-2">
              <p>ยังไม่มีข้อมูลบุคลากรในกลุ่มนี้</p>
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 rounded-xl bg-[#0b1f3a] text-white font-bold text-xs"
              >
                + เพิ่มบุคลากรในหมวดนี้
              </button>
            </div>
          ) : (
                        <div className="space-y-8">
              {/* TOP CENTER: Leader / ผู้อำนวยการ / หัวหน้ากลุ่มสาระ / หัวหน้ากลุ่มงาน */}
              {topLeader && (
                <div className="flex flex-col items-center justify-center w-full pb-2">
                  <div className="w-full flex justify-center">
                    {renderCard(topLeader, true)}
                  </div>
                </div>
              )}

              {/* BOTTOM: Member Grid (3 Columns) */}
              {regularMembers.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
                  {regularMembers.map(member => renderCard(member, false))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add/Edit Personnel matching screenshot exactly */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  PERSONNEL PROFILE
                </p>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                  {isNew ? 'เพิ่มข้อมูลบุคลากรใหม่' : isAdmin ? 'แก้ไขข้อมูลบุคลากร' : 'รายละเอียดข้อมูลบุคลากร'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {saveStatus && (
              <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-bold ${saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                {saveStatus.type === 'success' ? '✓ ' : '⚠️ '}{saveStatus.message}
              </div>
            )}

            <form onSubmit={handleSavePerson} className="py-4 space-y-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Column: Photo Uploader */}
                <div className="md:col-span-4 flex flex-col items-center space-y-2.5">
                  {isAdmin ? (
                    <label className="cursor-pointer w-full rounded-2xl border-2 border-dashed border-emerald-400/80 bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors p-3 flex flex-col items-center justify-center text-center group">
                      <div className="w-32 h-40 rounded-xl overflow-hidden bg-gradient-to-b from-[#1b4378] to-[#102a4e] p-0.5 shadow-inner mb-2 flex items-center justify-center">
                        {formData.photoUrl ? (
                          <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover rounded-[10px]" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-white/80">
                            <Camera className="w-8 h-8 mb-1" />
                            <span className="text-[10px]">ไม่มีรูปภาพ</span>
                          </div>
                        )}
                      </div>
                      <strong className="text-emerald-700 text-xs font-bold group-hover:underline">
                        {formData.photoUrl ? 'เปลี่ยนรูปประจำตัว' : 'เพิ่มรูปประจำตัว'}
                      </strong>
                      <small className="text-[10px] text-slate-400 mt-0.5">
                        JPG, PNG หรือ WebP · ไม่เกิน 5 MB
                      </small>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  ) : (
                    <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/20 p-3 flex flex-col items-center justify-center text-center">
                      <div className="w-32 h-40 rounded-xl overflow-hidden bg-gradient-to-b from-[#1b4378] to-[#102a4e] p-0.5 shadow-inner mb-2 flex items-center justify-center">
                        {formData.photoUrl ? (
                          <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover rounded-[10px]" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-white/80">
                            <Camera className="w-8 h-8 mb-1" />
                            <span className="text-[10px]">ไม่มีรูปภาพ</span>
                          </div>
                        )}
                      </div>
                      <strong className="text-slate-700 text-xs font-bold">
                        รูปประจำตัว
                      </strong>
                    </div>
                  )}

                  {isAdmin && formData.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
                      className="w-full py-1.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors"
                    >
                      ลบรูปปัจจุบัน
                    </button>
                  )}
                </div>

                {/* Right Column: 2-Column Fields Grid */}
                <div className="md:col-span-8 space-y-3">
                  <div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">รหัสบุคลากร</label>
                      <input
                        type="text"
                        required
                        disabled={!isAdmin || !isNew}
                        value={formData.id || ''}
                        onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden font-bold text-slate-800 disabled:opacity-85 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">คำนำหน้าและชื่อ–นามสกุล</label>
                      <input
                        type="text"
                        required
                        disabled={!isAdmin}
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="เช่น นางสาวปาริชาต บุญมี"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden font-bold text-slate-800 disabled:opacity-85 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">ตำแหน่ง</label>
                      <input
                        type="text"
                        required
                        disabled={!isAdmin}
                        value={formData.position || ''}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        placeholder="เช่น ครูชำนาญการพิเศษ"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden font-medium text-slate-800 disabled:opacity-85 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">กลุ่มสาระ/กลุ่มงาน</label>
                      <input
                        type="text"
                        required
                        disabled={!isAdmin}
                        value={formData.department || ''}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        placeholder="เช่น กลุ่มสาระคณิตศาสตร์"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden font-medium text-slate-800 disabled:opacity-85 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">ประเภทบุคลากร</label>
                      <select
                        value={formData.personnelType || 'ข้าราชการครู'}
                        disabled={!isAdmin}
                        onChange={(e) => {
                          const val = e.target.value;
                          let newRole = formData.role || 'teacher';
                          
                          // Keep administrative roles intact, map generic roles based on personnel type
                          const isSpecialRole = ['admin', 'director', 'deputy_personnel', 'deputy_budget', 'academic_affairs', 'head'].includes(newRole);
                          if (!isSpecialRole) {
                            if (val === 'พนักงานขับรถยนต์') newRole = 'driver';
                            else if (val === 'เจ้าหน้าที่สนับสนุนการสอน') newRole = 'technician';
                            else newRole = 'teacher';
                          }
                          
                          setFormData({
                            ...formData,
                            personnelType: val,
                            role: newRole as User['role']
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden font-medium text-slate-800 disabled:opacity-85 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                      >
                        <option value="ข้าราชการครู">ข้าราชการครู</option>
                        <option value="ครูอัตราจ้าง">ครูอัตราจ้าง</option>
                        <option value="ครูต่างชาติ">ครูต่างชาติ</option>
                        <option value="พนักงานราชการ">พนักงานราชการ</option>
                        <option value="เจ้าหน้าที่สนับสนุนการสอน">เจ้าหน้าที่สนับสนุนการสอน</option>
                        <option value="ลูกจ้างประจำ">ลูกจ้างประจำ</option>
                        <option value="พนักงานขับรถยนต์">พนักงานขับรถยนต์</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">สถานะ</label>
                      <select
                        defaultValue="ปฏิบัติงาน"
                        disabled={!isAdmin}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden font-medium text-slate-800 disabled:opacity-85 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                      >
                        <option value="ปฏิบัติงาน">ปฏิบัติงาน</option>
                        <option value="ลาศึกษาต่อ">ลาศึกษาต่อ</option>
                        <option value="ลาออก">ลาออก</option>
                        <option value="เกษียณอายุ">เกษียณอายุ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">โทรศัพท์</label>
                      <input
                        type="tel"
                        disabled={!isAdmin}
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="เช่น 08-6087-5497"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden text-slate-800 disabled:opacity-85 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">อีเมล</label>
                    <input
                      type="email"
                      required
                      disabled={!isAdmin}
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="เช่น teacher@mmv.ac.th"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden text-slate-800 disabled:opacity-85 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Box: งานที่ได้รับมอบหมาย with Input Adder */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-700" />
                    <span>งานที่ได้รับมอบหมาย ({formData.assignments?.length || 0})</span>
                  </h4>
                  {isAdmin && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      เพิ่มหน้าที่พิเศษตามคำสั่งโรงเรียน
                    </span>
                  )}
                </div>

                {/* Input row to add new assignment (Without Order No field) */}
                {isAdmin && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] text-slate-500 font-bold mb-1">กลุ่มงานใหญ่</label>
                      <select
                        value={newAssignmentGroup}
                        onChange={(e) => setNewAssignmentGroup(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-800 outline-hidden"
                      >
                        <option value="กลุ่มบริหารวิชาการ">กลุ่มบริหารวิชาการ</option>
                        <option value="กลุ่มบริหารงานบุคคล">กลุ่มบริหารงานบุคคล</option>
                        <option value="กลุ่มบริหารงบประมาณ">กลุ่มบริหารงบประมาณ</option>
                        <option value="กลุ่มบริหารงานทั่วไป">กลุ่มบริหารงานทั่วไป</option>
                        <option value="สำนักอำนวยการ">สำนักอำนวยการ</option>
                        <option value="กิจกรรมพัฒนาผู้เรียน">กิจกรรมพัฒนาผู้เรียน</option>
                      </select>
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-[10px] text-slate-500 font-bold mb-1">ชื่องาน / หน้าที่ที่ได้รับมอบหมาย</label>
                      <input
                        type="text"
                        value={newAssignmentRole}
                        onChange={(e) => setNewAssignmentRole(e.target.value)}
                        placeholder="เช่น หัวหน้ากลุ่มสาระภาษาไทย..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs outline-hidden text-slate-800 font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={handleAddAssignment}
                        className="w-full py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition-colors"
                      >
                        + เพิ่มงาน
                      </button>
                    </div>
                  </div>
                )}

                {/* List of current assignments Grouped by Major Division */}
                {formData.assignments && formData.assignments.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {Object.entries(groupAssignmentsByDivision(formData.assignments)).map(([divisionName, items]) => (
                      <div key={divisionName} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                          <strong className="text-blue-900 font-bold text-xs flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-700"></span>
                            {divisionName}
                          </strong>
                          <span className="text-[10px] text-blue-900 font-bold bg-blue-50 px-2 py-0.2 rounded-full border border-blue-200">
                            {items.length} ภารกิจ
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {items.map((item, idx) => {
                            const globalIndex = formData.assignments!.findIndex(orig => orig === item);
                            return (
                              <div key={idx} className="py-2 flex items-start justify-between text-xs border-b border-slate-100 last:border-b-0">
                                <div className="min-w-0 pr-2 space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-800">● {item.role}</span>
                                    {item.orderRef && (
                                      <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-md font-medium max-w-[200px] truncate" title={item.orderRef}>
                                        {item.orderRef.replace('คำสั่งโรงเรียนมกุฎเมืองราชวิทยาลัย', 'คำสั่ง')}
                                      </span>
                                    )}
                                  </div>
                                  {item.duty && (
                                    <p className="text-[11px] text-slate-600 font-medium pl-3.5 leading-relaxed">
                                      {item.duty}
                                    </p>
                                  )}
                                </div>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAssignment(globalIndex)}
                                    className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 shrink-0 transition-colors mt-0.5"
                                    title="ลบงานนี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-3 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                    ยังไม่มีรายการงานที่ได้รับมอบหมาย (สามารถเพิ่มผ่านช่องด้านบนได้)
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5">
                {!isAdmin ? (
                  <div className="w-full flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-6 py-2 rounded-xl bg-slate-850 hover:bg-slate-900 text-white font-extrabold text-xs shadow-md transition-colors cursor-pointer"
                    >
                      ปิดหน้าต่าง
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      {!isNew && (
                        <button
                          type="button"
                          onClick={handleDeletePerson}
                          className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบรายชื่อ / ลาออก</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowEditModal(false)}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-[#1b4e8c] hover:bg-[#163e70] text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>บันทึกข้อมูลและรูป</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Bulk Photo Upload with Auto Matching */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div>
                <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
                  BULK PHOTO UPLOADER
                </p>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                  <span>📸 อัปโหลดรูปถ่ายครูทั้งโรงเรียนพร้อมกัน</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {bulkFiles.length} รูป
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  ระบบจับคู่ชื่อไฟล์อัตโนมัติตามรหัสครู (เช่น MMV01.jpg, 01.jpg) หรือชื่อครู
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setBulkFiles([]);
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Uploaded Photos Table / Grid */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {/* Drop area to add more photos */}
              <label className="cursor-pointer border-2 border-dashed border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/60 p-4 rounded-2xl flex items-center justify-center gap-3 transition-colors">
                <Upload className="w-5 h-5 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-800">
                  + คลิกหรือลากรูปภาพมาเพิ่มที่นี่
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleBulkFilesSelect}
                />
              </label>

              {bulkFiles.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  ยังไม่ได้เลือกไฟล์รูปภาพ
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {bulkFiles.map((item, idx) => {
                    const matchedUser = personnelList.find(p => p.id === item.matchedUserId);
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border flex items-center gap-3.5 transition-all ${
                          item.matchedUserId
                            ? 'bg-white border-slate-200 shadow-2xs'
                            : 'bg-amber-50/50 border-amber-200'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="w-16 h-20 rounded-xl overflow-hidden bg-[#0b1f3a] p-0.5 shrink-0 shadow-inner">
                          <img
                            src={item.previewUrl}
                            alt={item.filename}
                            className="w-full h-full object-cover rounded-[10px]"
                          />
                        </div>

                        {/* File info and Matching Dropdown */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-mono font-bold text-slate-700 truncate" title={item.filename}>
                              📄 {item.filename}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleBulkRemoveItem(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg"
                              title="ลบรูปนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">
                              จับคู่กับครู:
                            </label>
                            <select
                              value={item.matchedUserId}
                              onChange={(e) => handleBulkReassign(idx, e.target.value)}
                              className={`w-full px-2 py-1 rounded-lg border text-xs font-medium outline-hidden ${
                                item.matchedUserId
                                  ? 'border-emerald-300 bg-emerald-50/40 text-slate-800'
                                  : 'border-amber-300 bg-amber-50 text-amber-900 font-bold'
                              }`}
                            >
                              <option value="">-- กรุณาเลือกครู --</option>
                              {personnelList.map(p => (
                                <option key={p.id} value={p.id}>
                                  [{p.id}] {p.name} ({p.department})
                                </option>
                              ))}
                            </select>
                          </div>

                          {matchedUser && (
                            <p className="text-[10px] text-emerald-700 font-semibold truncate">
                              ✓ {matchedUser.name} · {matchedUser.position}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500">
                จับคู่สำเร็จ{' '}
                <strong className="text-emerald-700">
                  {bulkFiles.filter(f => f.matchedUserId).length}
                </strong>{' '}
                / {bulkFiles.length} รูป
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkUploadModal(false);
                    setBulkFiles([]);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isProcessingBulk || bulkFiles.filter(f => f.matchedUserId).length === 0}
                  onClick={handleSaveBulkPhotos}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isProcessingBulk ? 'กำลังประมวลผล...' : `✓ บันทึกรูปถ่ายทั้งหมด (${bulkFiles.filter(f => f.matchedUserId).length} รูป)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
