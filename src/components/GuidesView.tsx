import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  BookOpen, 
  Search, 
  Target, 
  Trophy, 
  User, 
  Users, 
  Tv, 
  TrendingUp, 
  Sparkles, 
  ArrowRight, 
  X, 
  Play, 
  HelpCircle,
  CheckCircle2,
  Lock,
  ChevronRight,
  ClipboardCheck,
  Sword
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { motion, AnimatePresence } from "motion/react";

export interface GuideItem {
  id: string;
  titleVi: string;
  titleEn: string;
  category: "all" | "athlete" | "tournament" | "pk" | "admin" | "tv";
  icon: React.ComponentType<any>;
  badgeVi: string;
  badgeEn: string;
  badgeColor: string;
  spanClass: string;
  stepsVi: string[];
  stepsEn: string[];
  tipsVi: string[];
  tipsEn: string[];
}

export const GUIDES_DATA: GuideItem[] = [
  {
    id: "create_tournament",
    titleVi: "Hướng Dẫn Tạo Giải Đấu Mới chuyên nghiệp",
    titleEn: "Create Tournament Guide",
    category: "tournament",
    icon: Trophy,
    badgeVi: "Tổ Chức Giải",
    badgeEn: "Organizers",
    badgeColor: "bg-amber-500/10 text-amber-500 dark:bg-amber-400/15 dark:text-amber-400 border border-amber-500/25",
    spanClass: "md:col-span-2 lg:col-span-2",
    stepsVi: [
      "Đăng nhập với tài khoản có quyền Quản trị viên (Admin) hoặc Ban Tổ Chức (BTC).",
      "Từ Trang Chủ, nhấn nút 'TẠO GIẢI ĐẤU MỚI' (hoặc truy cập mục cài đặt cấu hình).",
      "Điền đầy đủ thông tin cốt lõi: Tên giải đấu, địa điểm, thời gian diễn ra, link ảnh banner truyền thông.",
      "Cấu hình chi tiết vòng đấu: Chọn Thể thức (Cá nhân, Đồng đội hoặc Kết hợp). Thiết lập cự ly thi đấu (mặc định 10m và 15m), số lượng phát bắn mỗi lượt (ví dụ: 10 phát) và Hệ số nhân điểm (Multiplier) của từng cự ly.",
      "Thiết lập Sơ đồ luồng bắn (Lane Capacity) để hệ thống tự động phân phối VĐV vào các làn đấu và chia lượt bắn (Flights/Squads) tự động, giúp tối ưu hóa thời gian thi đấu."
    ],
    stepsEn: [
      "Login with an account having Admin or Organizer privileges.",
      "From the Homepage, click 'CREATE TOURNAMENT' (or access settings panel).",
      "Fill in core details: Match name, location, date-time, and banner URL.",
      "Configure format details: Choose Competition Mode (Individual, Team, or Combined). Set up shooting distances (default 10m & 15m), shots per set, and target multipliers.",
      "Set Lane Capacity so the system automatically assigns athletes to lanes and generates shooting flights/squads."
    ],
    tipsVi: [
      "Nên sử dụng chế độ 'Bản nháp' để thử nghiệm phân chia đường bắn và sơ đồ lượt đấu trước khi công bố giải đấu chính thức.",
      "Hãy gán email của các Trọng tài phụ (Sub-Admins/Referees) để họ có quyền đăng nhập ghi điểm trực tiếp tại làn bắn."
    ],
    tipsEn: [
      "Use the 'Draft Mode' to simulate and preview lanes/flights assignment before publishing.",
      "Assign assistant referees' emails in the setup so they can login and record scores directly at the lanes."
    ]
  },
  {
    id: "pk_challenge",
    titleVi: "Quy trình Đăng Kèo PK Thách Đấu & Giao Hữu",
    titleEn: "PK Challenge Arena Guide",
    category: "pk",
    icon: Target,
    badgeVi: "Độc quyền VSC",
    badgeEn: "VSC Exclusive",
    badgeColor: "bg-rose-500/10 text-rose-500 dark:bg-rose-400/15 dark:text-rose-400 border border-rose-500/25",
    spanClass: "md:col-span-1 lg:col-span-1",
    stepsVi: [
      "Truy cập phân hệ 'Thách Đấu PK' từ thanh điều hướng chính.",
      "Nhấn 'ĐĂNG KÈO PK', chọn Thể thức (Đơn đấu 1v1 hoặc Đấu đồng đội Câu lạc bộ).",
      "Chọn Loại mục tiêu: Bia mục tiêu (mặc định tự gán quy cách 'Bia đường kính 4cm') hoặc Bia giấy tính điểm VSC (tự gán 'Bia giấy VSC 10 vòng đường kính 19.5cm tâm 1.5cm').",
      "Thiết lập số phát bắn mỗi hiệp, số hiệp đấu (BO3, BO5...) và tùy chọn ký gửi VSC Points làm phần thưởng thách đấu.",
      "Nhập mã PIN bảo mật riêng cho kèo đấu của bạn để tránh người lạ tự ý nhấn tham gia nếu đây là kèo giao hữu kín."
    ],
    stepsEn: [
      "Navigate to the 'PK Arena' from the main menu.",
      "Click 'CREATE PK CHALLENGE', select Battle format (1v1 Solo or Club/Team vs Team).",
      "Select Target Type: Target Plate (auto-sets 'Bia đường kính 4cm') or Paper Scoreboard (auto-sets 'Bia giấy VSC 10 vòng đường kính 19.5cm tâm 1.5cm').",
      "Configure shots per set, total sets (BO3, BO5...) and optionally put VSC Points wager.",
      "Set a private security PIN for your challenge to prevent unauthorized players from joining."
    ],
    tipsVi: [
      "Hệ thống sẽ tự động điền đúng quy cách Bia thi đấu tiêu chuẩn của Hiệp hội Ná cao su Việt Nam (VSC) khi bạn chọn loại Bia tương ứng.",
      "Mời một Trọng tài uy tín trong hệ thống giám sát để kết quả được duyệt nhanh và chính xác nhất."
    ],
    tipsEn: [
      "The system auto-populates official Vietnam Slingshot Association (VSC) target specifications based on target type selected.",
      "Designate a trusted referee to judge the match so results can be certified instantly."
    ]
  },
  {
    id: "training_tracker",
    titleVi: "Nhật Ký Tập Luyện Cá Nhân & Biểu Đồ Phong Độ",
    titleEn: "Personal Training Guide",
    category: "athlete",
    icon: TrendingUp,
    badgeVi: "Dành cho VĐV",
    badgeEn: "For Athletes",
    badgeColor: "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-400/15 dark:text-emerald-400 border border-emerald-500/25",
    spanClass: "md:col-span-1 lg:col-span-1",
    stepsVi: [
      "Đăng nhập tài khoản cá nhân, mở trình đơn góc tài khoản và chọn 'Tiến Trình Luyện Tập'.",
      "Nhấn 'Ghi Lượt Tập Mới' để bắt đầu ghi chép thông tin.",
      "Cấu hình cự ly tập luyện (10m, 12m, 15m...) và loại bia tập bắn.",
      "Nhập kết quả bắn thực tế: Có thể nhập nhanh tổng số điểm/phát trúng hoặc nhập từng phát bắn chi tiết.",
      "Hệ thống sẽ lưu trữ và tự động vẽ nên Biểu đồ Tiến trình để bạn theo dõi xu hướng phong độ qua thời gian."
    ],
    stepsEn: [
      "Log in, open your profile dropdown, and select 'Training Progress'.",
      "Click 'Record New Session' to start logging details.",
      "Choose your training distance (10m, 12m, 15m...) and target type.",
      "Input actual results: Use quick input for total scores or enter precise hits for each shot.",
      "The system saves sessions and automatically draws Progress Charts to monitor performance trends."
    ],
    tipsVi: [
      "Hãy kiên trì ghi nhận ít nhất 2 lượt tập mỗi ngày. Biểu đồ đường cong phong độ sẽ giúp bạn phát hiện thời điểm cơ tay mệt mỏi để điều chỉnh nhịp thở.",
      "Bạn có thể xem thống kê lịch sử mọi ngày để so sánh sự ổn định giữa cự ly 10m và 15m."
    ],
    tipsEn: [
      "Consistency is key! Record at least 2 sessions daily to help pinpoint fatigue patterns and breathing issues.",
      "Analyze historical records to compare your accuracy and consistency between 10m and 15m."
    ]
  },
  {
    id: "profile_setup",
    titleVi: "Đăng Ký Đăng Nhập & Đồng Bộ Hồ Sơ VĐV Hệ Thống",
    titleEn: "Account & Athlete Profile Sync",
    category: "athlete",
    icon: User,
    badgeVi: "Bắt đầu nhanh",
    badgeEn: "Quick Start",
    badgeColor: "bg-blue-500/10 text-blue-500 dark:bg-blue-400/15 dark:text-blue-400 border border-blue-500/25",
    spanClass: "md:col-span-1 lg:col-span-1",
    stepsVi: [
      "Nhấn 'ĐĂNG KÝ | ĐĂNG NHẬP' ở thanh điều hướng trên cùng.",
      "Nhập Email và mật khẩu của bạn để tạo tài khoản, hoặc đăng nhập trực tiếp cực nhanh bằng tài khoản Google.",
      "Khi đăng nhập lần đầu, hãy điền đầy đủ: Biệt danh thi đấu, Câu lạc bộ chủ quản, Số điện thoại và Tỉnh thành sinh hoạt.",
      "Nhấn 'Lưu hồ sơ'. Hệ thống sẽ tự động đối soát thông tin của bạn với cơ sở dữ liệu VĐV Quốc gia.",
      "Khi đăng ký các giải đấu chính thức, hồ sơ này sẽ được tự động đồng bộ vào danh sách thi đấu chỉ với một nút bấm."
    ],
    stepsEn: [
      "Click 'REGISTER | LOGIN' at the top right of the navigation bar.",
      "Enter your Email and password to register, or sign in instantly using Google Authentication.",
      "On first login, complete your profile: Competition nickname, Club, Phone, and Region.",
      "Click 'Save Profile'. The system automatically matches your info with the National Athlete database.",
      "When registering for tournaments, this bio will automatically synchronize into the competitor roster."
    ],
    tipsVi: [
      "Hãy điền chính xác Tên thật trùng với giấy tờ thi đấu để Ban Tổ Chức duyệt hồ sơ nhanh chóng khi đăng ký tham gia các giải vô địch quốc gia.",
      "Nếu bạn sinh hoạt tự do, hãy chọn Câu lạc bộ là 'Tự Do' để hệ thống ghi nhận chính xác."
    ],
    tipsEn: [
      "Provide your real name matching your ID card so organizers can approve your registration for major tournaments.",
      "If you are an independent player, choose 'Tự Do' (Independent) as your Club designation."
    ]
  },
  {
    id: "create_athletes_clubs",
    titleVi: "Tạo VĐV & CLB Hệ Thống - Quản lý cơ sở dữ liệu VSC",
    titleEn: "Manage System Athletes & Clubs",
    category: "admin",
    icon: Users,
    badgeVi: "Quản Lý Hệ Thống",
    badgeEn: "System Manager",
    badgeColor: "bg-indigo-500/10 text-indigo-500 dark:bg-indigo-400/15 dark:text-indigo-400 border border-indigo-500/25",
    spanClass: "md:col-span-1 lg:col-span-1",
    stepsVi: [
      "Đăng nhập tài khoản Admin, điều hướng đến mục 'VĐV NCS' hoặc 'CLB NCS' trên thanh menu chính.",
      "Nhấn 'Thêm Vận Động Viên' hoặc 'Đăng Ký Câu Lạc Bộ Mới'.",
      "Nhập mã số định danh ID duy nhất cho VĐV (Ví dụ: VSC-0102) để không bị trùng lặp.",
      "Cung cấp thông tin bắt buộc: Tên đầy đủ, CLB chủ quản, Địa phương và Số điện thoại liên hệ.",
      "Đối với Câu lạc bộ: Nhập tên đầy đủ, tên viết tắt, tỉnh thành và tải lên Logo của CLB. Nhấn 'Lưu lại' để cập nhật lên đám mây."
    ],
    stepsEn: [
      "Login as Admin, navigate to 'System Athletes' or 'System Clubs' directories from the main header.",
      "Click 'Add New Athlete' or 'Register New Club'.",
      "Assign a unique ID (e.g. VSC-0102) for the athlete to prevent score conflicts.",
      "Input mandatory details: Full name, active club, location, and contact number.",
      "For Clubs: Input full name, abbreviation, province, and upload a custom logo. Save to cloud database."
    ],
    tipsVi: [
      "Mã số ID của VĐV trong danh mục hệ thống là khóa cốt lõi giúp liên kết lịch sử đấu, thành tích PK, và tích lũy điểm thưởng VSC Points toàn quốc.",
      "Cập nhật logo CLB sắc nét giúp bảng xếp hạng đồng đội trông chuyên nghiệp hơn trên màn hình trình chiếu."
    ],
    tipsEn: [
      "Athlete IDs are the primary key used to track lifetime match histories, PK scores, and cumulative national ranking points.",
      "Always upload high-quality, transparent club logos to keep team standings looking sharp."
    ]
  },
  {
    id: "tv_mode_guide",
    titleVi: "Thiết lập Trình Chiếu Liveboard Tivi 50 inch siêu sắc nét",
    titleEn: "TV Broadcast Liveboard Setup",
    category: "tv",
    icon: Tv,
    badgeVi: "Bản tin Tivi",
    badgeEn: "TV Broadcast",
    badgeColor: "bg-emerald-550/10 text-emerald-500 dark:bg-emerald-400/15 dark:text-emerald-450 border border-emerald-500/25",
    spanClass: "md:col-span-2 lg:col-span-3",
    stepsVi: [
      "Tại bảng điều khiển Giải đấu (Dashboard), nhấn nút 'CHẾ ĐỘ TIVI' (hoặc 'TV Broadcast') màu xanh lá lấp lánh.",
      "Hệ thống sẽ mở giao diện trình chiếu tối ưu riêng cho Tivi ngang kích thước lớn, tập trung vào độ tương phản cao và chữ lớn.",
      "Không cần dùng phím phân trang! Hệ thống đã được tích hợp bộ cuộn mượt tự động (Smooth Auto-Scroll) thông minh cho các danh sách: ĐANG THI ĐẤU (Lượt hiện tại), CHỜ THI ĐẤU (Lượt tiếp theo), và BẮN THỬ (Lượt khởi động).",
      "Slide trình chiếu sẽ tự động xoay vòng sau mỗi khoảng thời gian định sẵn (Mặc định: 10 giây cho danh sách và 20 giây cho Đường bắn đang đấu).",
      "Bạn có thể điều khiển trực tiếp bằng chuột hoặc dùng các nút Tạm dừng (Pause), Tiến (Next), Lùi (Prev) ngay góc trên cùng của màn hình TV."
    ],
    stepsEn: [
      "From the active Tournament Dashboard, click the glowing green 'TV MODE' or 'TIVI BROADCAST' button.",
      "The app launches a specialized widescreen layout optimized for big smart TVs, featuring ultra-high contrast and massive text.",
      "Forget pagination keys! The TV board is integrated with an elegant, smooth vertical auto-scroll for all rosters: ACTIVE SQUAD, NEXT SQUAD, and WARMING SQUAD.",
      "The presentation rotates slides automatically (Default: 10 seconds for rosters, 20 seconds for active lanes).",
      "You can manually override, pause, or skip slides using the control buttons at the top right of the TV board."
    ],
    tipsVi: [
      "Hãy bấm phím F11 trên bàn phím máy tính đang kết nối với Tivi để đưa trình duyệt về chế độ Toàn Màn Hình (Full Screen) tối ưu nhất.",
      "Mã số vận động viên được giản lược tối đa chỉ hiển thị phần số trên TV để khán giả đứng từ khoảng cách 20-30 mét vẫn có thể nhận biết rõ ràng."
    ],
    tipsEn: [
      "Press F11 on the computer connected to the TV to switch the web browser to full-screen mode for the best clean display.",
      "Athlete IDs are stripped down to their numeric parts on the TV slides so spectators can easily read them from 25 meters away."
    ]
  },
  {
    id: "referee_scoring_guide",
    titleVi: "Hướng Dẫn Trọng Tài Gọi VĐV & Ghi Điểm Giải Đấu",
    titleEn: "Referee Match Administration & Scoring Guide",
    category: "tournament",
    icon: ClipboardCheck,
    badgeVi: "Trọng Tài & BTC",
    badgeEn: "Referee & BTC",
    badgeColor: "bg-[#004ca3]/10 text-[#004ca3] dark:bg-blue-400/15 dark:text-blue-400 border border-[#004ca3]/25",
    spanClass: "md:col-span-1 lg:col-span-1",
    stepsVi: [
      "Truy cập Bảng điều khiển Giải đấu (Dashboard) của giải bạn làm Quản trị viên hoặc Trọng tài được phân quyền.",
      "Vào mục 'Nhập Ghi Điểm' hoặc 'Điều Hành Trận Đấu' trên thanh menu đỏ của giải đấu.",
      "Nhấp vào nút 'GỌI VĐV VÀO LÀN' (Call Athlete to Lane) để xếp VĐV từ danh sách chờ vào làn bắn trống tương ứng theo sơ đồ đường bắn.",
      "Sử dụng bàn phím số trực quan (Bia giấy 10 vòng) hoặc nút gạt Trúng/Hụt nhanh (Bia sắt mục tiêu) để ghi điểm thời gian thực cho từng phát bắn.",
      "Bấm nút 'Lưu điểm lượt này' để hệ thống tính điểm trung bình và cập nhật trực tiếp lên bảng xếp hạng trực tuyến cũng như màn hình Tivi."
    ],
    stepsEn: [
      "Access the Tournament Dashboard where you have Admin or Referee permissions assigned.",
      "Go to 'Input Scores' or 'Tournament Execution Hub' from the red navigation bar.",
      "Click the 'CALL ATHLETE TO LANE' button to assign an athlete from the waiting queue to an empty lane.",
      "Use the numeric keypad (for VSC Paper Targets) or Hit/Miss triggers (for Steel Targets) to log points in real-time.",
      "Click 'Save Scores' to instantly calculate averages and update live standings across public boards and TVs."
    ],
    tipsVi: [
      "Trọng tài có thể mở nhiều làn bắn trên các điện thoại khác nhau để nhiều trọng tài cùng chấm điểm song song mà không lo bị trùng lặp dữ liệu.",
      "Sử dụng biểu tượng 'Ổ khóa' ở góc chấm điểm nếu cần sửa lại điểm bị ghi nhầm khi có sự đồng ý của Giám sát trận đấu."
    ],
    tipsEn: [
      "Referees can open different lanes on multiple phones to log scores concurrently without data conflicts.",
      "Use the 'Lock' icon next to the scoring input to unlock and edit mistyped scores under supervisor consent."
    ]
  },
  {
    id: "pk_spectator_scoring",
    titleVi: "Hướng Dẫn Vào Khán Đài PK & Trọng Tài Chấm Điểm PK",
    titleEn: "Entering PK Spectator Stand & Referee Scoring Guide",
    category: "pk",
    icon: Sword,
    badgeVi: "Đấu PK 1v1",
    badgeEn: "1v1 PK Arena",
    badgeColor: "bg-rose-500/10 text-rose-500 dark:bg-rose-400/15 dark:text-rose-400 border border-rose-500/25",
    spanClass: "md:col-span-1 lg:col-span-1",
    stepsVi: [
      "Từ sảnh chính 'Thách Đấu PK', tìm trận đấu đang diễn ra mà bạn muốn theo dõi hoặc điều hành.",
      "Nhấn nút 'VÀO KHÁN ĐÀI PK' (Spectator Stand) để gia nhập màn hình theo dõi luồng bia và điểm số thời gian thực của hai đối thủ.",
      "Nếu bạn được chỉ định làm Trọng tài cho trận này, hãy nhấp vào 'Đăng Ký Chấm Điểm' hoặc nhập mã PIN Trọng tài được thỏa thuận.",
      "Mỗi khi vận động viên thực hiện phát bắn, nhấp vào nút điểm tương ứng ở bảng của vận động viên đó (Trúng/Hụt hoặc điểm số vòng bia).",
      "Hệ thống sẽ đồng bộ hóa và phát sóng kết quả từng phát bắn lên màn hình của tất cả khán giả đang có mặt tại Khán đài PK."
    ],
    stepsEn: [
      "From the main 'PK Arena' lobby, locate the active match you wish to watch or moderate.",
      "Click 'ENTER SPECTATOR STAND' to load the real-time match flow, target states, and live dual board.",
      "If you are the designated Referee, click 'Register to Score' or enter the agreed Referee PIN.",
      "As each athlete shoots, click the corresponding point button (Hit/Miss or concentric ring score) on their side.",
      "The system will sync and broadcast each shot instantly to all spectators present in the Spectator Stand."
    ],
    tipsVi: [
      "Khán đài PK hỗ trợ chế độ màn hình kép song song, giúp người hâm mộ từ xa vẫn có thể nắm bắt rõ ràng diễn biến bắn của cả 2 đấu thủ.",
      "Đảm bảo kết nối mạng internet ổn định để tránh bị trễ nhịp cập nhật phát bắn."
    ],
    tipsEn: [
      "The PK Stand supports a side-by-side dual screen layout, enabling remote fans to view both targets clearly.",
      "Ensure a stable internet connection for latency-free shot and point updates."
    ]
  },
  {
    id: "pk_athlete_sign_protocol",
    titleVi: "Hướng Dẫn VĐV Ký Biên Bản & Khóa Kết Quả Trận PK",
    titleEn: "Athlete Match Sign-off & Lock Results Guide",
    category: "pk",
    icon: ClipboardCheck,
    badgeVi: "Dành cho Đấu Thủ",
    badgeEn: "For Contenders",
    badgeColor: "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-400/15 dark:text-emerald-400 border border-emerald-500/25",
    spanClass: "md:col-span-1 lg:col-span-1",
    stepsVi: [
      "Ngay khi trận đấu PK hoàn thành các hiệp đấu quy định, trọng tài sẽ bấm nút 'TỔNG HỢP & LẬP BIÊN BẢN TRẬN ĐẤU'.",
      "Bảng biên bản tổng hợp kết quả từng hiệp, tổng điểm và hiệu số sẽ hiện lên trước mắt hai đấu thủ.",
      "Mỗi vận động viên nhấp vào nút 'KÝ BIÊN BẢN' (Sign Protocol) đặt ngay dưới tên tài khoản của mình.",
      "Sử dụng ngón tay để vẽ trực tiếp chữ ký của bạn lên màn hình cảm ứng điện thoại (hoặc giữ chuột trái vẽ trên máy tính) và bấm 'Xác nhận'.",
      "Khi cả hai đấu thủ hoàn tất ký tên, biên bản trận đấu sẽ tự động khóa lại, hệ thống VSC lưu trữ vĩnh viễn kết quả và cộng/trừ điểm xếp hạng VSC Points quốc gia."
    ],
    stepsEn: [
      "As soon as the PK match sets are complete, the referee clicks 'Compile & Generate Match Protocol'.",
      "A summary sheet showing set results, total scores, and point differentials appears for both players.",
      "Each player clicks the 'SIGN PROTOCOL' button positioned directly under their name card.",
      "Draw your signature using your finger on touch screens (or left-click and drag on desktop) and press 'Confirm'.",
      "Once both contenders sign off, the protocol locks, saving the official match history permanently and auto-adjusting VSC Points standings."
    ],
    tipsVi: [
      "Nếu phát hiện có sai sót trong quá trình trọng tài chấm điểm, vận động viên hãy khiếu nại trước khi nhấn nút ký tên.",
      "Sau khi đã ký, biên bản được lưu trữ trên Đám mây của VSC và không một ai kể cả Admin có thể thay đổi kết quả."
    ],
    tipsEn: [
      "If you spot a score mismatch during referee input, raise a claim to the referee BEFORE signing.",
      "Once signed, the protocol is locked in the VSC Cloud database and cannot be altered by anyone, including Admins."
    ]
  }
];

interface GuidesViewProps {
  onBackToHome?: () => void;
  inlineId?: string; // If specified, renders only a specific guide or highlights it
}

export function GuidesView({ onBackToHome, inlineId }: GuidesViewProps) {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "athlete" | "tournament" | "pk" | "admin" | "tv">("all");
  const [selectedDetailedGuide, setSelectedDetailedGuide] = useState<GuideItem | null>(null);

  // Filter guides based on category and search query
  const filteredGuides = useMemo(() => {
    return GUIDES_DATA.filter((guide) => {
      const matchesCategory = selectedCategory === "all" || guide.category === selectedCategory;
      const title = language === "en" ? guide.titleEn.toLowerCase() : guide.titleVi.toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = title.includes(query) || 
        guide.stepsVi.some(s => s.toLowerCase().includes(query)) ||
        guide.stepsEn.some(s => s.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, language]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 font-sans text-slate-800 dark:text-slate-100" id="guides-view-root">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 bg-[#9c0c13]/10 dark:bg-red-500/10 text-[#9c0c13] dark:text-red-400 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </span>
            <span className="text-xs font-black text-[#9c0c13] dark:text-red-400 uppercase tracking-widest font-mono">
              VSCS Knowledge Base
            </span>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-wider bg-gradient-to-r from-red-650 via-rose-500 to-indigo-500 dark:from-red-400 dark:via-rose-300 dark:to-indigo-300 bg-clip-text text-transparent">
            {language === "en" ? "Interactive Guides & Pro-Tips" : "Hướng Dẫn Sử Dụng & Mẹo Chuyên Nghiệp"}
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 max-w-2xl font-medium">
            {language === "en" 
              ? "Comprehensive step-by-step documentation designed in a modern Bento grid layout to help you master the VSCS Slingshot ecosystem."
              : "Bộ tài liệu chi tiết, trực quan được sắp xếp dưới dạng lưới Bento hiện đại giúp bạn làm chủ toàn bộ hệ thống quản lý giải đấu và sảnh đấu ná cao su."
            }
          </p>
        </div>
        
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto shrink-0"
          >
            {language === "en" ? "← Back to Lobby" : "← Quay lại sảnh"}
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs mb-8 flex flex-col md:flex-row gap-4 items-center">
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full md:w-auto py-1">
          {[
            { id: "all", labelVi: "Tất cả", labelEn: "All" },
            { id: "athlete", labelVi: "Vận Động Viên", labelEn: "Athletes" },
            { id: "tournament", labelVi: "Tổ chức Giải", labelEn: "Tournaments" },
            { id: "pk", labelVi: "Thách Đấu PK", labelEn: "PK Arena" },
            { id: "tv", labelVi: "Bản tin Tivi", labelEn: "TV Broadcast" },
            { id: "admin", labelVi: "Quản lý Giải & CLB", labelEn: "Management" }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer border shrink-0 ${
                selectedCategory === cat.id
                  ? "bg-[#9c0c13] text-white border-[#9c0c13] shadow-xs shadow-red-950/20"
                  : "bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {language === "en" ? cat.labelEn : cat.labelVi}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={language === "en" ? "Search guidelines, tips, keywords..." : "Tìm kiếm hướng dẫn, mẹo, từ khóa..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 dark:text-white transition-all font-semibold"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white border-none bg-transparent cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bento Grid Roster */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="guides-bento-grid">
        {filteredGuides.map((guide) => {
          const IconComponent = guide.icon;
          const displayTitle = language === "en" ? guide.titleEn : guide.titleVi;
          const displayBadge = language === "en" ? guide.badgeEn : guide.badgeVi;
          const previewSteps = language === "en" ? guide.stepsEn.slice(0, 2) : guide.stepsVi.slice(0, 2);

          return (
            <motion.div
              layoutId={`bento-card-${guide.id}`}
              key={guide.id}
              onClick={() => setSelectedDetailedGuide(guide)}
              className={`${guide.spanClass} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-xs hover:shadow-md dark:hover:shadow-black/30 transition-all duration-300 group cursor-pointer hover:border-[#9c0c13]/35 dark:hover:border-red-500/35 relative overflow-hidden flex flex-col justify-between`}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {/* Subtle background glow effect on hover */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-red-500/5 to-indigo-500/5 dark:from-red-400/5 dark:to-indigo-400/5 rounded-bl-full pointer-events-none transition-opacity group-hover:opacity-100" />

              <div>
                {/* Badge and Icon header */}
                <div className="flex justify-between items-center mb-5">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${guide.badgeColor}`}>
                    {displayBadge}
                  </span>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-2xl text-[#9c0c13] dark:text-red-400 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-5 h-5" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-black text-slate-850 dark:text-white leading-snug group-hover:text-[#9c0c13] dark:group-hover:text-red-400 transition-colors mb-3">
                  {displayTitle}
                </h3>

                {/* Micro Steps Preview */}
                <div className="space-y-2.5 mb-5 mt-2">
                  {previewSteps.map((step, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start text-xs text-slate-550 dark:text-slate-400 font-medium">
                      <span className="w-4.5 h-4.5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-black text-slate-500 shrink-0 font-mono mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="line-clamp-2 leading-relaxed">{step}</span>
                    </div>
                  ))}
                  {guide.stepsVi.length > 2 && (
                    <p className="text-[10px] text-[#9c0c13] dark:text-red-400 font-black uppercase tracking-wider pl-7 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      {language === "en" ? `+ ${guide.stepsVi.length - 2} more steps` : `+ ${guide.stepsVi.length - 2} bước tiếp theo`}
                      <ChevronRight className="w-3 h-3" />
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer action */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between mt-auto">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  {guide.category.toUpperCase()} CATEGORY
                </span>
                <span className="text-xs font-black text-slate-800 dark:text-white group-hover:text-[#9c0c13] dark:group-hover:text-red-400 flex items-center gap-1">
                  {language === "en" ? "Read Guide" : "Xem chi tiết"}
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </motion.div>
          );
        })}

        {filteredGuides.length === 0 && (
          <div className="col-span-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
            <HelpCircle className="w-12 h-12 text-slate-350 dark:text-slate-600 mb-3" />
            <p className="text-sm font-bold text-slate-550 dark:text-slate-400">
              {language === "en" ? "No instructions matches your search." : "Không tìm thấy bài hướng dẫn phù hợp với từ khóa."}
            </p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
              className="mt-3 px-4 py-2 bg-[#9c0c13] text-white text-xs font-extrabold rounded-xl hover:bg-red-800 transition-all cursor-pointer"
            >
              {language === "en" ? "Reset Filters" : "Xóa bộ lọc"}
            </button>
          </div>
        )}
      </div>

      {/* Pro Tips Banner Block (Sits below the bento) */}
      <div className="mt-10 bg-gradient-to-r from-slate-900 via-[#1b1c1e] to-zinc-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-xl" id="guides-pro-tips-banner">
        <div className="absolute top-0 right-0 w-80 h-full bg-[#9c0c13]/5 rounded-l-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 bg-amber-400/10 text-amber-400 border border-amber-400/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest font-mono">
              <Sparkles className="w-3 h-3 animate-spin" /> VSCS Pro tips
            </span>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">
              {language === "en" ? "Slingshot Tournament Automation Rule" : "Quy Tắc Tự Động Hóa Giải Đấu Ná Cao Su"}
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {language === "en"
                ? "Did you know? Setting up the target type automatically configures the scoring workspace. 'Bia giấy VSC' enables a 10-ring numeric keypad, while 'Bia mục tiêu' displays intuitive HIT/MISS toggle triggers for quick lane referee audits."
                : "Bạn có biết? Việc thiết lập loại bia thi đấu trong Thách Đấu PK sẽ tự động tối ưu hóa màn hình ghi điểm. Giao diện 'Bia giấy VSC' sẽ mở bàn phím số 10 vòng, trong khi 'Bia mục tiêu' kích hoạt các nút gạt TRÚNG/HỤT nhanh chóng."
              }
            </p>
          </div>
          <button
            onClick={() => {
              const tvGuide = GUIDES_DATA.find(g => g.id === "tv_mode_guide");
              if (tvGuide) setSelectedDetailedGuide(tvGuide);
            }}
            className="px-5 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-950/20 hover:scale-105 active:scale-95 self-start md:self-auto shrink-0 flex items-center gap-1.5"
          >
            {language === "en" ? "Configure Live TV Broadcast" : "Cấu hình Bản Tin Tivi"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detailed Guide Dialog (Interactive Walkthrough Modal) */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {selectedDetailedGuide && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" id="detailed-guide-modal-overlay">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25 }}
                className="bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
              >
                {/* Header */}
                <div className="px-6 py-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#9c0c13]/10 dark:bg-red-500/10 text-[#9c0c13] dark:text-red-400 rounded-xl">
                      {React.createElement(selectedDetailedGuide.icon, { className: "w-5 h-5" })}
                    </div>
                    <div>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${selectedDetailedGuide.badgeColor}`}>
                        {language === "en" ? selectedDetailedGuide.badgeEn : selectedDetailedGuide.badgeVi}
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1 leading-none">
                        {language === "en" ? selectedDetailedGuide.titleEn : selectedDetailedGuide.titleVi}
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDetailedGuide(null)}
                    className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer border-none"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Steps Section */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#9c0c13] dark:text-red-400 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      {language === "en" ? "STEP-BY-STEP FLOW" : "TIẾN TRÌNH THỰC HIỆN Từng bước"}
                    </h3>
                    <div className="space-y-4">
                      {(language === "en" ? selectedDetailedGuide.stepsEn : selectedDetailedGuide.stepsVi).map((step, idx) => (
                        <div key={idx} className="flex gap-4 items-start bg-slate-50 dark:bg-slate-850/40 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                          <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#9c0c13] to-red-600 text-white flex items-center justify-center text-xs font-black shrink-0 font-mono shadow-sm">
                            {idx + 1}
                          </span>
                          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-semibold">
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tips Section */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 dark:text-amber-400 mb-3.5 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
                      {language === "en" ? "PRO-TIPS & ACCELERATORS" : "MẸO THI ĐẤU & KINH NGHIỆM ĐẮT GIÁ"}
                    </h3>
                    <div className="bg-amber-400/5 border border-amber-400/20 rounded-2xl p-4 space-y-2.5">
                      {(language === "en" ? selectedDetailedGuide.tipsEn : selectedDetailedGuide.tipsVi).map((tip, idx) => (
                        <div key={idx} className="flex gap-2.5 items-start text-xs sm:text-xs text-slate-650 dark:text-amber-200/90 font-medium">
                          <span className="text-amber-500 font-extrabold shrink-0 mt-0.5">•</span>
                          <p className="leading-relaxed font-semibold">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    VSC GUIDELINES • ID: {selectedDetailedGuide.id}
                  </span>
                  <button
                    onClick={() => setSelectedDetailedGuide(null)}
                    className="px-5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-750 text-white font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer border-none"
                  >
                    {language === "en" ? "Understood, Close" : "Đã hiểu, Đóng"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}

// -------------------------------------------------------------
// CONTEXTUAL SMART GUIDE TRIGGER & POPUP COMPONENT
// -------------------------------------------------------------
interface SmartGuideTriggerProps {
  guideId: string;
  className?: string;
  label?: string;
}

export function SmartGuideTrigger({ guideId, className = "", label }: SmartGuideTriggerProps) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // Retrieve the specific guide from metadata
  const guide = useMemo(() => {
    return GUIDES_DATA.find((g) => g.id === guideId);
  }, [guideId]);

  if (!guide) return null;

  const IconComponent = guide.icon;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-400/10 hover:bg-amber-400/25 text-amber-600 dark:text-amber-400 border border-amber-400/20 hover:border-amber-400/40 rounded-lg cursor-pointer transition-all active:scale-95 shrink-0 ${className}`}
        title={language === "en" ? `View guide for ${guide.titleEn}` : `Xem hướng dẫn về ${guide.titleVi}`}
      >
        <HelpCircle className="w-3.5 h-3.5 shrink-0 animate-pulse text-amber-500" />
        <span>{label || (language === "en" ? "Guide / Tips" : "Hướng Dẫn / Mẹo")}</span>
      </button>

      {/* Embedded Walkthrough Dialog */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" id={`smart-guide-overlay-${guideId}`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh] text-left"
              >
                {/* Header */}
                <div className="px-5 py-4.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                      <IconComponent className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${guide.badgeColor}`}>
                        {language === "en" ? guide.badgeEn : guide.badgeVi}
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-1 leading-none">
                        {language === "en" ? guide.titleEn : guide.titleVi}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer border-none"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Steps & Tips */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Steps */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {language === "en" ? "How it works" : "Các bước thực hiện"}
                    </div>
                    <div className="space-y-3">
                      {(language === "en" ? guide.stepsEn : guide.stepsVi).map((step, idx) => (
                        <div key={idx} className="flex gap-3 items-start bg-slate-50 dark:bg-slate-850/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                          <span className="w-5.5 h-5.5 rounded-lg bg-[#9c0c13] text-white flex items-center justify-center text-[10px] font-black shrink-0 font-mono shadow-sm">
                            {idx + 1}
                          </span>
                          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-semibold">
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pro Tips */}
                  <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-3.5 space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                      {language === "en" ? "Pro Slingshot Tip" : "Mẹo chuyên nghiệp"}
                    </div>
                    {(language === "en" ? guide.tipsEn : guide.tipsVi).map((tip, idx) => (
                      <div key={idx} className="flex gap-2 items-start text-xs text-slate-650 dark:text-amber-250 font-medium">
                        <span className="text-amber-500 font-extrabold shrink-0">•</span>
                        <p className="leading-relaxed font-semibold">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    VSC ACCELERATOR
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-750 text-white font-extrabold text-[10px] uppercase rounded-lg transition-all cursor-pointer border-none"
                  >
                    {language === "en" ? "Got It" : "Đã hiểu"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
