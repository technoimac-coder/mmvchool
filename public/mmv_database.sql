-- ========================================================
-- ฐานข้อมูลระบบสารสนเทศ โรงเรียนมกุฎเมืองราชวิทยาลัย (MMV MIS)
-- Domain: mmvschool.ac.th
-- HostAtom MySQL Database Schema & Seed Data
-- ========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;


DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `position` varchar(255) DEFAULT '',
  `academic_position` varchar(255) DEFAULT '',
  `department` varchar(255) DEFAULT '',
  `role` varchar(50) DEFAULT 'teacher',
  `email` varchar(255) DEFAULT '',
  `phone` varchar(50) DEFAULT '',
  `avatar` longtext,
  `organization` varchar(255) DEFAULT 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง',
  `personnel_type` varchar(100) DEFAULT '',
  `assigned_duties` longtext,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `vehicles`;
CREATE TABLE `vehicles` (
  `id` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `license_plate` varchar(50) NOT NULL,
  `type` varchar(50) DEFAULT 'van',
  `capacity` int(11) DEFAULT 12,
  `driver_name` varchar(255) DEFAULT '',
  `driver_phone` varchar(50) DEFAULT '',
  `status` varchar(50) DEFAULT 'available',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `vehicle_bookings`;
CREATE TABLE `vehicle_bookings` (
  `id` varchar(50) NOT NULL,
  `user_id` varchar(20) NOT NULL,
  `user_name` varchar(255) NOT NULL,
  `user_phone` varchar(50) DEFAULT '',
  `department` varchar(255) DEFAULT '',
  `destination` varchar(255) NOT NULL,
  `purpose` text NOT NULL,
  `passenger_count` int(11) DEFAULT 1,
  `approval_letter_no` varchar(100) DEFAULT '',
  `teachers_list` longtext,
  `students_list` longtext,
  `start_date` date NOT NULL,
  `start_time` varchar(20) NOT NULL,
  `end_date` date NOT NULL,
  `end_time` varchar(20) NOT NULL,
  `vehicle_id` varchar(20) DEFAULT NULL,
  `vehicle_name` varchar(255) DEFAULT NULL,
  `license_plate` varchar(50) DEFAULT NULL,
  `is_external_rental` tinyint(1) DEFAULT 0,
  `rental_details` varchar(255) DEFAULT NULL,
  `rental_cost` decimal(10,2) DEFAULT 0.00,
  `assigned_driver_id` varchar(20) DEFAULT NULL,
  `assigned_driver_name` varchar(255) DEFAULT NULL,
  `assigned_driver_phone` varchar(50) DEFAULT NULL,
  `booking_stage` varchar(50) DEFAULT 'deputy_budget_allocation',
  `status` varchar(50) DEFAULT 'pending',
  `admin_comment` text,
  `deputy_comment` text,
  `driver_ack_comment` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


INSERT INTO `vehicles` (`id`, `name`, `license_plate`, `type`, `capacity`, `driver_name`, `driver_phone`, `status`) VALUES
('v1', 'รถตู้ Toyota Commuter', 'ขค 1456', 'van', 12, 'นายชาญวุฒน์ ต้องทำกิจ', '08-0181-1318', 'available'),
('v2', 'รถตู้ Hyundai H-1', 'นข 7555', 'van', 11, 'นายนพรุจ ความเพียร', '08-1176-8105', 'available'),
('v3', 'รถตู้ Toyota Commuter (สีเงิน)', 'นข 3399', 'van', 12, 'หมุนเวียน', '', 'available');

INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV01', 'นางสาวมณฑาทิพย์ เสาวคนธ์', 'ผู้อำนวยการ ชำนาญการพิเศษ', 'ผู้อำนวยการ', 'director', 'monthatip.krupui@gmail.com', '09-7016-0888', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV02', 'นางสาวอรชุมา วงศ์ช่าง', 'รองผู้อำนวยการ ชำนาญการพิเศษ', 'รองผู้อำนวยการฝ่ายวิชาการ', 'deputy_personnel', 'onchumawong@gmail.com', '09-8232-6244', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV03', 'นายไชยวัฒน์ บุญมี', 'รองผู้อำนวยการ ชำนาญการพิเศษ', 'รองผู้อำนวยการฝ่ายบริหารทั่วไป', 'deputy_personnel', 'chaiwat26022523@gmail.com', '08-2463-0330', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV04', 'นางสาวสุริยาพร นพกรเศรษฐกุล', 'รองผู้อำนวยการ ชำนาญการ', 'รองผู้อำนวยการฝ่ายงบประมาณ,ฝ่ายงานบุคคล', 'deputy_budget', 'fernnsuri@gmail.com', '08-5593-5626', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV05', 'นางวรรณา เมืองคำ', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระภาษาต่างประเทศ', 'teacher', 'muangkham2509@gmail.com', '09-0132-0085', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV06', 'นางสุธาทิพย์ เกษมพิณ', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระคณิตศาสตร์', 'head', 'pinsutha@yahoo.co.th', '08-7135-1947', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV07', 'นางสาวพัชรา วงษ์ทองดี', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'head', 'pachara_v@yahoo.com', '08-6377-6594', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV08', 'นางสาวชูขวัญ มงคลสุข', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระคณิตศาสตร์', 'head', 'chukhwan@mmv.ac.th', '09-7159-2915', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV09', 'นางสาวสาวิการ์ เชื้อนาข่า', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระคณิตศาสตร์', 'head', 'sawika2020@gmail.com', '08-6147-3388', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV10', 'นางสาวกาญจนา สมคิด', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'head', 'adjankan@hotmail.com', '08-1863-2346', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV11', 'นางสาวปาริชาต บุญมี', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระคณิตศาสตร์', 'head', 'ob.ab@hotmail.com', '08-6087-5497', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV12', 'นางสาวสุนิศา อวยพร', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระภาษาต่างประเทศ', 'head', 'whiteandbluebb@gmail.com', '06-4249-2953', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV13', 'นางวันวิสาข์ อาชีวะ', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'head', 'wanwisachidae@gmail.com', '08-5435-8322', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV14', 'นางสาวอัชฌาพัชญ์ แก้วแกมกาญจน์', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระคณิตศาสตร์', 'head', 'atchapat2559@gmail.com', '09-5548-7848', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV15', 'นางนฤมล ไกรพงษ์', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'head', 'naruemon@mmv.ac.th', '08-1591-2339', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV16', 'นางทิตยา โนชัย', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'head', 'pinya_28@hotmail.com', '08-7538-1903', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV17', 'นายสิทธิพันธุ์ กมลฤทัย', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระภาษาต่างประเทศ', 'head', 'siddhibhan@gmail.com', '06-4936-5997', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV18', 'นายเลิศพงษ์ รื่นรมย์', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'head', 'Lersphong@gmail.com', '08-9528-9065', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV19', 'นางสาวธัญณิชชวีร์ ธนากูลจิรพันธ์', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระภาษาไทย', 'head', 'k.kanya1989@gmail.com', '09-5324-1444', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV20', 'นายอนุชา โสลำภา', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'head', 'gengjung_101@hotmail.com', '08-9542-2986', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV22', 'นางสาวอัญชนิดา จาดสันทัด', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระภาษาต่างประเทศ', 'head', 'anchanida@gmail.com', '09-4549-2162', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV25', 'นางขนิษฐา เนตรนิยม', 'ครูชำนาญการพิเศษ', 'กลุ่มสาระภาษาไทย', 'head', 'nitta429@gmail.com', '09-4663-5583', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV21', 'นางเยาวลักษณ์ ปรุงแต่งกิจ', 'ครูชำนาญการ', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'head', 'yao.pru@gmail.com', '08-1431-9421', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV23', 'นางวัฒนา สรรเสริญ', 'ครูชำนาญการ', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'head', 'punim13@hotmail.com', '08-9939-7965', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV24', 'นางสาวพัชรินทร์ กงประโคน', 'ครูชำนาญการ', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'head', 'phatcharin@mmv.ac.th', '08-2205-5281', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV26', 'นางสาวจสิตรา สิงห์ทอง', 'ครูชำนาญการ', 'กลุ่มงานกิจกรรมพัฒนาผู้เรียน', 'head', 'nihon_go_8@hotmail.com', '08-7130-3082', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV27', 'นางสาวรัตติกาล อินพูลวงษ์', 'ครูชำนาญการ', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'head', 'Rattikan@mmv.ac.th', '06-3239-2361', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV28', 'นางสาวสุชาวดี แซ่ตั้ง', 'ครูชำนาญการ', 'กลุ่มสาระสังคมศึกษา ศาสนาและวัฒนธรรม', 'head', 'suchawadeesaetung@gmail.com', '06-3135-4591', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV29', 'นางสาวกนกพร มโนชมภู', 'ครูชำนาญการ', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'head', 'kruchu.chem@gmail.com', '08-5707-5866', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV30', 'นางสาวฤทัยรัตน์ เทศจันทร์', 'ครูชำนาญการ', 'กลุ่มสาระสังคมศึกษา ศาสนาและวัฒนธรรม', 'head', 'iqeyeq@gmail.com', '08-9404-1521', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV31', 'ว่าที่ร้อยตรีหญิงปัฐมาพร สุวรรณโชติ', 'ครูชำนาญการ', 'กลุ่มสาระสุขศึกษาและพลศึกษา', 'head', 'pae_ladyfirst@hotmail.com', '09-6795-0755', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV32', 'นายชัยวุฒิ โกสัลล์วัฒนา', 'ครูชำนาญการ', 'กลุ่มสาระศิลปะ', 'head', 'Chaiyavut.k@gmail.com', '08-8213-9726', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV33', 'นางสาวชญานี ไทรสมุทร', 'ครูชำนาญการ', 'กลุ่มสาระภาษาต่างประเทศ', 'head', 'Cyn.chaiyani@gmail.com', '09-3561-9954', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV34', 'นายณัฐวุฒิ บุราโส', 'ครูชำนาญการ', 'กลุ่มสาระสังคมศึกษา ศาสนาและวัฒนธรรม', 'head', 'natthawut@mmv.ac.th', '09-5559-9174', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV35', 'นายมานนท์ วิชิตการ', 'ครูชำนาญการ', 'กลุ่มสาระสุขศึกษาและพลศึกษา', 'head', 'padbork56@gmail.com', '08-4104-1655', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV36', 'นายณัฐพงศ์ นุชสุข', 'ครูชำนาญการ', 'กลุ่มสาระคณิตศาสตร์', 'head', 'tae.natthaphong@gmail.com', '09-7921-3131', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV37', 'นางวิมลรัตน์ ศรีวะรมย์', 'ครูชำนาญการ', 'กลุ่มสาระการงานอาชีพ', 'head', 'pandy.wimonrat@gmail.com', '06-1169-1407', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV38', 'นางสาวสุภัทรา ศรีทาพักตร์', 'ครูชำนาญการ', 'กลุ่มสาระคณิตศาสตร์', 'head', 'Suputtra.yingyai@gmail.com', '09-8281-5436', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV39', 'นายสมหมาย ต้นกันยา', 'ครูชำนาญการ', 'กลุ่มสาระสังคมศึกษา ศาสนาและวัฒนธรรม', 'head', 'sommai.tonganya@gmail.com', '06-1739-8512', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV40', 'นางสาวศศิสกุล มีศิริ', 'ครูชำนาญการ', 'กลุ่มสาระภาษาไทย', 'head', 'kwang.sasi0423@gmail.com', '08-7904-5081', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV41', 'นางวิกัติรัชต์ แก้วอามาตย์', 'ครู', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'head', 'nongwigattirut@gmail.com', '06-3309-2961', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV42', 'นายไนยนิมมาน เนตรสังข์', 'ครู', 'กลุ่มสาระภาษาต่างประเทศ', 'head', 'goodreal1997@gmail.com', '08-2708-5078', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV43', 'นางสาวพิมพ์ชนก พวงพี่', 'ครู', 'กลุ่มสาระคณิตศาสตร์', 'head', 'impimch_pimchanok@hotmail.com', '09-2327-4763', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV44', 'นายณรงค์กรณ์ พลเทพ', 'ครู', 'กลุ่มสาระสุขศึกษาและพลศึกษา', 'head', 'poshnaronggon@gmail.com', '06-4512-8207', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV45', 'นายชิตพล ปฏิสังข์', 'ครู', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'head', 'chittapon205@gmail.com', '061-949-3003', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV46', 'นางสาวกมลวรรณ มากเจริญ', 'ครู', 'กลุ่มสาระสังคมศึกษา ศาสนาและวัฒนธรรม', 'head', 'benzkamon@gmail.com', '08-9095-2614', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV47', 'นางสาวอาทิตยา ทรายสุวรรณ', 'ครู', 'กลุ่มสาระศิลปะ', 'head', 'migail_maxgelo@hotmail.com', '09-7278-8076', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV48', 'นางสาวนภัสสร นวลรัตน์', 'ครู', 'กลุ่มสาระศิลปะ', 'head', 'Napassornnuanrat@gmail.com', '09-2721-0171', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV49', 'นายทัชชกร ศรีเนตร', 'ครู', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'head', 'norawitter@gmail.com', '06-5685-1556', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV50', 'นางสาวสุกรรกราญ ไวสะอาด', 'ครู', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'teacher', 'sukankran1313@gmail.com', '09-2572-1203', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV51', 'นางสาวอนัญญา แน่นอุดร', 'ครู', 'กลุ่มสาระการงานอาชีพ', 'head', 'ananya.18052540@gmail.com', '08-2133-8236', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV52', 'นางสาวสุภาวดี แสกะโทก', 'ครู', 'กลุ่มงานกิจกรรมพัฒนาผู้เรียน', 'head', 'kan.kchch170141@gmail.com', '06-5020-4717', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV53', 'นางสาวพนิดา เสายอด', 'ครู', 'กลุ่มสาระภาษาไทย', 'head', 'Phanijamz@gmail.com', '09-6181-6570', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV54', 'นางสาววราภรณ์ พยุงวงษ์', 'ครู', 'กลุ่มสาระสังคมศึกษา ศาสนาและวัฒนธรรม', 'head', 'kwun090542@gmail.com', '09-3367-5217', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV55', 'นางสุพรรณี เลิศธัญญา', 'ครู', 'กลุ่มสาระภาษาต่างประเทศ', 'head', 'Muay1017.por@gmail.com', '08-2217-0618', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV56', 'นางสาววิรากร ถกลประจักษ์', 'ครูผู้ช่วย', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'teacher', 'wira.2545m@gmail.com', '09-2445-7114', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV57', 'นางสาวมนัสศิการ กวางบ้าน', 'ครูผู้ช่วย', 'กลุ่มสาระภาษาไทย', 'teacher', 'Manutsikan.k@gmail.com', '09-3308-6328', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV58', 'นางสาวญาณิศา โพธิกะ', 'ครูผู้ช่วย', 'กลุ่มสาระภาษาต่างประเทศ', 'teacher', 'yanisa.ph@kkumail.com', '09-5238-2543', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV59', 'นางสาวชัชฏาพร คำลุน', 'ครูผู้ช่วย', 'กลุ่มสาระคณิตศาสตร์', 'teacher', 'filmsod12@gmail.com', '08-1749-6773', 'ข้าราชการครู', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV60', 'นางสาวรัชนีวรรณ ชูศรีจันทร์', 'พนักงานราชการ', 'กลุ่มสาระสังคมศึกษา ศาสนาและวัฒนธรรม', 'teacher', 'Nongyam54@hotmail.com', '09-2813-3245', 'พนักงานราชการ', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV61', 'นางสาวณัฐพร เบญจามฤต', 'พนักงานราชการ', 'กลุ่มสาระสุขศึกษาและพลศึกษา', 'head', 'nb_sine@hotmail.com', '08-3995-2795', 'พนักงานราชการ', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV62', 'นายวรพงศ์ ตันติชัยวนิช', 'พนักงานวิทยาศาสตร์', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'teacher', 'ingjoy2522@gmail.com', '09-7247-5908', 'พนักงานวิทยาศาสตร์', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV63', 'นางสาวอัญชนา คงมั่น', 'พนักงานวิทยาศาสตร์', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'teacher', 'anchana_an1996@hotmail.com', '09-0132-0946', 'พนักงานวิทยาศาสตร์', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV64', 'นางสาวณัฐติยา ผิวอ่อน', 'พนักงานวิทยาศาสตร์', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'teacher', 'nattiya.np18@gmail.com', '09-0132-0944', 'พนักงานวิทยาศาสตร์', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV65', 'นางสาวลักษิกา คล้ายคลึง', 'พนักงานวิทยาศาสตร์', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'teacher', 'luksikaok20@gmail.com', '06-1848-3699', 'พนักงานวิทยาศาสตร์', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV66', 'นางสาวจิณรัตน์ ภูกองไชย', 'พนักงานวิทยาศาสตร์', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'teacher', 'jinnarat2542@gmail.com', '06-2459-1849', 'พนักงานวิทยาศาสตร์', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV67', 'นางสาวนารีรัตน์ วิลัยรัตน์', 'พนักงานวิทยาศาสตร์', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'teacher', 'nareerat.v98@gmail.com', '08-5045-6954', 'พนักงานวิทยาศาสตร์', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV68', 'นางสาวกฤษณา สุพรรณวงค์', 'ครูอัตราจ้าง', 'กลุ่มงาน English Program', 'teacher', 'nanny_youtoo@hotmail.com', '09-2778-2891', 'ครูอัตราจ้าง', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV69', 'นางสาวนาริน เทวบาล', 'ครูอัตราจ้าง', 'กลุ่มงาน English Program', 'teacher', 'Ploy2688@hotmail.com', '09-0945-3732', 'ครูอัตราจ้าง', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV70', 'นายวิชญ์พล เอกวงษา', 'ครูอัตราจ้าง', 'กลุ่มงานหอพักนักเรียนประจำ', 'teacher', 'daybreak_nik@hotmail.com', '09-9607-8735', 'ครูอัตราจ้าง', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV71', 'นางสาวมะลิวัลย์ เสาวคนธ์', 'ครูอัตราจ้าง', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'teacher', 'maliwan.saowakon@gmail.com', '09-6860-8479', 'ครูอัตราจ้าง', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV72', 'นายนันทชัย เหมรา', 'ครูอัตราจ้าง', 'กลุ่มสาระการงานอาชีพ', 'teacher', 'nantachaihemara2541@gmail.com', '09-3119-9918', 'ครูอัตราจ้าง', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV73', 'นางสาวกมลชนก บึ้งสลุง', 'ครูอัตราจ้าง', 'กลุ่มงาน English Program', 'teacher', 'buengsalung.k@gmail.com', '09-0287-5242', 'ครูอัตราจ้าง', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV74', 'นายณัฐภูมิ เดชวุ่น', 'ครูอัตราจ้าง', 'กลุ่มสาระภาษาต่างประเทศ', 'teacher', 'ntp.ppoomm@gmail.com', '090-778-3409', 'ครูอัตราจ้าง', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV75', 'นายเรวัต เขี้ยวแก้ว', 'ครูอัตราจ้าง', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'teacher', 'rawat.tt.ty15947@gmail.com', '06-2494-0861', 'ครูอัตราจ้าง', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV76', 'นายจิรวัฒน์ พลอยวิเศษแสง', 'ครูอัตราจ้าง', 'กลุ่มงาน English Program', 'teacher', 'jirawatploywisetsaeng@gmail.com', '09-3695-5158', 'ครูอัตราจ้าง', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV77', 'นางสาวจริยา วงศ์ขจิต', 'ครูอัตราจ้าง', 'กลุ่มงาน English Program', 'teacher', 'jariyawongkajit1607@gmail.com', '08-0339-8878', 'ครูอัตราจ้าง', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV78', 'นางสาวอวัศยา โสภะขันธ์', 'ครูอัตราจ้าง', 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี', 'teacher', 'awatsaya06@gmail.com', '09-8461-5289', 'ครูอัตราจ้าง', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV79', 'นางสาวศิรินภา ปากน้ำ', 'ครูอัตราจ้าง', 'กลุ่มงาน English Program', 'teacher', 'sirinapar.sp@gmail.com', '09-8154-3440', 'ครูอัตราจ้าง', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV80', 'นายอริยะ สังข์ผาด', 'ครูอัตราจ้าง', 'กลุ่มงาน English Program', 'teacher', 'mark260245@gmail.com', '09-8115-3561', 'ครูอัตราจ้าง', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV81', 'Ms.Shilfa Densing Pontillas', 'ครูอัตราจ้าง', 'กลุ่มสาระภาษาต่างประเทศ', 'teacher', '-', '', 'ครูต่างชาติ', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV82', 'Mrs.Clofil Jane Pontillas Odapin', 'ครูอัตราจ้าง', 'กลุ่มงาน English Program', 'teacher', '-', '', 'ครูต่างชาติ', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV83', 'Mr.Eric Dela Torre Odapin', 'ครูอัตราจ้าง', 'กลุ่มงาน English Program', 'teacher', '-', '', 'ครูต่างชาติ', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV84', 'Mr.Jamile Saludares Sale', 'ครูอัตราจ้าง', 'กลุ่มงาน English Program', 'teacher', '-', '', 'ครูต่างชาติ', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV85', 'Mr.Warlito Jr. Angan-Angan Causing', 'ครูอัตราจ้าง', 'กลุ่มงาน English Program', 'teacher', '-', '', 'ครูต่างชาติ', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV86', 'Mr.Jhoryn Jhon Bocao Tiano', 'ครูอัตราจ้าง', 'กลุ่มงาน English Program', 'teacher', '-', '', 'ครูต่างชาติ', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV87', 'Ms.Mechie Neil Bero Dela Cruz', 'ครูอัตราจ้าง', 'กลุ่มงาน English Program', 'teacher', '-', '', 'ครูต่างชาติ', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV88', 'Mrs.Sayrene Dela Cruz Mangabat', 'ครูอัตราจ้าง', 'กลุ่มงาน English Program', 'teacher', '-', '', 'ครูต่างชาติ', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV89', 'MissMineveh Loria Pontuya', 'ครูอัตราจ้าง', 'กลุ่มงาน English Program', 'teacher', '-', '', 'ครูต่างชาติ', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV90', 'นางจริณญา ทวีสัตย์', 'เจ้าหน้าที่สนับสนุนการสอน', 'เจ้าหน้าที่สนับสนุนการสอน', 'teacher', 'Jarinya_ku@hotmail.com', '08-6822-9945', 'เจ้าหน้าที่สนับสนุนการสอน', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV91', 'นางสาธิยา ชื่นทรวง', 'เจ้าหน้าที่สนับสนุนการสอน', 'เจ้าหน้าที่สนับสนุนการสอน', 'teacher', 'sathiya.pra9998@gmail.com', '08-1075-0687', 'เจ้าหน้าที่สนับสนุนการสอน', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV92', 'นางสาวกนกนาถ สุทธิสถิตย์', 'เจ้าหน้าที่สนับสนุนการสอน', 'เจ้าหน้าที่สนับสนุนการสอน', 'teacher', 'Kanoknartnongkim@gmail.com', '06-5438-6921', 'เจ้าหน้าที่สนับสนุนการสอน', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV93', 'นางสาวปภัชญา ศรีบูระไชย', 'เจ้าหน้าที่สนับสนุนการสอน', 'เจ้าหน้าที่สนับสนุนการสอน', 'teacher', 'ppcysbrc@gmail.com', '09-0954-6169', 'เจ้าหน้าที่สนับสนุนการสอน', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV94', 'นายเจษฎา ผสมทรัพย์', 'เจ้าหน้าที่สนับสนุนการสอน', 'เจ้าหน้าที่สนับสนุนการสอน', 'teacher', 'jessada9037@gmail.com', '09-2331-6207', 'เจ้าหน้าที่สนับสนุนการสอน', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV95', 'นางสาวณภัทร อาจหาญ', 'เจ้าหน้าที่สนับสนุนการสอน', 'เจ้าหน้าที่สนับสนุนการสอน', 'teacher', 'napat.13112545@gmail.com', '09-2450-0139', 'เจ้าหน้าที่สนับสนุนการสอน', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV96', 'นางสาวธัญสิริ รัตนคุณ', 'เจ้าหน้าที่สนับสนุนการสอน', 'เจ้าหน้าที่สนับสนุนการสอน', 'teacher', 'bewbearr.123@gmail.com', '09-4781-9079', 'เจ้าหน้าที่สนับสนุนการสอน', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV97', 'นายกิจจา หิรัญรักษ์', 'ลูกจ้างประจำ', 'ลูกจ้างประจำ', 'teacher', 'mmv97@mmv.ac.th', '08-9834-7247', 'ลูกจ้างประจำ', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV98', 'นายชาญวุฒน์ ต้องทำกิจ', 'พนักงานขับรถยนต์', 'พนักงานขับรถยนต์', 'driver', 'mmv98@mmv.ac.th', '08-0181-1318', 'พนักงานขับรถยนต์', '[]');
INSERT INTO `users` (`id`, `name`, `position`, `department`, `role`, `email`, `phone`, `personnel_type`, `assigned_duties`) VALUES ('MMV99', 'นายนพรุจ ความเพียร', 'พนักงานขับรถยนต์', 'พนักงานขับรถยนต์', 'driver', 'mmv99@mmv.ac.th', '08-1176-8105', 'พนักงานขับรถยนต์', '[]');

SET FOREIGN_KEY_CHECKS = 1;