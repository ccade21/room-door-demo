'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Room = {
  id: number
  room_no: string
  name: string
  cleanliness: string
}

type BreakdownHistory = {
  id: number
  room_id: number
  issue_date: string
  summary: string
  status: string
  image_url: string | null
}

type RepairHistory = {
  id: number
  room_id: number
  repair_date: string
  summary: string
  image_url: string | null
}

export default function Home() {
  const router = useRouter()

  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [currentPage, setCurrentPage] = useState<'list' | 'detail' | 'admin'>('list')
  const [loading, setLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginMessage, setLoginMessage] = useState('')

  const [breakdownHistories, setBreakdownHistories] = useState<BreakdownHistory[]>([])
  const [repairHistories, setRepairHistories] = useState<RepairHistory[]>([])
  const [breakdownList, setBreakdownList] = useState<BreakdownHistory[]>([])

  const [searchInput, setSearchInput] = useState('')

  const [newIssueRoomId, setNewIssueRoomId] = useState('')
  const [newIssueDate, setNewIssueDate] = useState('')
  const [newIssueSummary, setNewIssueSummary] = useState('')
  const [newIssueStatus, setNewIssueStatus] = useState('접수')
  const [adminMessage, setAdminMessage] = useState('')

  useEffect(() => {
    checkSession()
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      fetchRooms()
      fetchBreakdownList()
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (selectedRoom) {
      fetchBreakdownHistories(selectedRoom.id)
      fetchRepairHistories(selectedRoom.id)
    }
  }, [selectedRoom])

  const roomMap = useMemo(() => {
    const map = new Map<number, Room>()
    rooms.forEach((room) => map.set(room.id, room))
    return map
  }, [rooms])

  const checkSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      setIsLoggedIn(true)
    } else {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    setLoginMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setLoginMessage('로그인 실패: 이메일 또는 비밀번호를 확인해줘')
      return
    }

    setIsLoggedIn(true)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setRooms([])
    setSelectedRoom(null)
    setBreakdownHistories([])
    setRepairHistories([])
    setBreakdownList([])
    setCurrentPage('list')
    setEmail('')
    setPassword('')
    setSearchInput('')
  }

  const fetchRooms = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('room_no', { ascending: true })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    const roomData = data || []
    setRooms(roomData)

    if (roomData.length > 0) {
      setSelectedRoom(roomData[0])
      if (!newIssueRoomId) {
        setNewIssueRoomId(String(roomData[0].id))
      }
    }

    setLoading(false)
  }

  const fetchBreakdownHistories = async (roomId: number) => {
    const { data, error } = await supabase
      .from('breakdown_history')
      .select('*')
      .eq('room_id', roomId)
      .order('issue_date', { ascending: false })

    if (error) {
      console.error('breakdown_history error:', error.message)
      return
    }

    setBreakdownHistories(data || [])
  }

  const fetchRepairHistories = async (roomId: number) => {
    const { data, error } = await supabase
      .from('repair_history')
      .select('*')
      .eq('room_id', roomId)
      .order('repair_date', { ascending: false })

    if (error) {
      console.error('repair_history error:', error.message)
      return
    }

    setRepairHistories(data || [])
  }

  const fetchBreakdownList = async () => {
    const { data, error } = await supabase
      .from('breakdown_history')
      .select('*')
      .in('status', ['접수', '진행중'])
      .order('issue_date', { ascending: false })

    if (error) {
      console.error('breakdown_list error:', error.message)
      return
    }

    setBreakdownList(data || [])
  }

  const handleSearchRoom = () => {
    const onlyNumber = searchInput.replace(/\D/g, '')

    if (!onlyNumber) {
      alert('룸 번호 숫자를 입력해줘')
      return
    }

    const targetRoomNo = `MB${onlyNumber}`
    const foundRoom = rooms.find((room) => room.room_no === targetRoomNo)

    if (!foundRoom) {
      alert(`MB${onlyNumber} 룸을 찾을 수 없음`)
      return
    }

    router.push(`/room/${foundRoom.room_no}`)
  }

  const handleCreateBreakdown = async () => {
    setAdminMessage('')

    if (!newIssueRoomId || !newIssueDate || !newIssueSummary) {
      setAdminMessage('룸, 접수일자, 고장 내용을 입력해줘')
      return
    }

    const roomId = Number(newIssueRoomId)

    const { error } = await supabase.from('breakdown_history').insert({
      room_id: roomId,
      issue_date: newIssueDate,
      summary: newIssueSummary,
      status: newIssueStatus,
    })

    if (error) {
      setAdminMessage(`등록 실패: ${error.message}`)
      return
    }

    setAdminMessage('고장 접수 등록 완료')

    const foundRoom = rooms.find((room) => room.id === roomId)
    if (foundRoom) {
      setSelectedRoom(foundRoom)
    }

    setNewIssueSummary('')
    setNewIssueStatus('접수')

    await fetchBreakdownList()
    if (roomId) {
      await fetchBreakdownHistories(roomId)
    }
  }

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold mb-2">생산1팀 Room 관리 시스템</h1>
          <p className="text-sm text-slate-500 mb-6">지정된 사용자만 로그인 후 접근 가능</p>

          <div className="space-y-4">
            <input
              className="w-full rounded-xl border px-4 py-3"
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="w-full rounded-xl border px-4 py-3"
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              onClick={handleLogin}
              className="w-full rounded-xl bg-black px-4 py-3 text-white"
            >
              로그인
            </button>

            {loginMessage && <p className="text-sm text-red-500">{loginMessage}</p>}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">생산1팀 Room 관리 시스템</h1>
            <p className="mt-1 text-sm text-slate-500">Room 정보 및 유지보수 이력 관리 데모</p>
          </div>

          <button onClick={handleLogout} className="rounded-xl border px-4 py-2">
            로그아웃
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b pb-3">
          <button
            className={`rounded-xl px-4 py-2 ${currentPage === 'list' ? 'bg-black text-white' : 'border'}`}
            onClick={() => setCurrentPage('list')}
          >
            룸 목록 페이지
          </button>

          <button
            className={`rounded-xl px-4 py-2 ${currentPage === 'detail' ? 'bg-black text-white' : 'border'}`}
            onClick={() => setCurrentPage('detail')}
          >
            상세 페이지
          </button>

          <button
            className={`rounded-xl px-4 py-2 ${currentPage === 'admin' ? 'bg-black text-white' : 'border'}`}
            onClick={() => setCurrentPage('admin')}
          >
            관리자 페이지
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">고장 List</h2>
              <span className="text-sm text-slate-500">접수 / 진행중만 표시</span>
            </div>

            {breakdownList.length === 0 ? (
              <div className="rounded-xl border p-4 text-sm text-slate-500">
                미조치 고장 건이 없음
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2">
                {breakdownList.map((item) => {
                  const room = roomMap.get(item.room_id)

                  return (
                    <Link
                      key={item.id}
                      href={room ? `/room/${room.room_no}` : '#'}
                      className="block w-full rounded-xl border p-4 text-left hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{room?.room_no || '룸 정보 없음'}</p>
                        <p className="text-sm text-slate-500">{item.issue_date}</p>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{room?.name || '-'}</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-sm text-red-600">{item.summary}</p>
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                          {item.status}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-4">룸 검색</h2>
            <p className="mb-3 text-sm text-slate-500">
              룸 번호 숫자만 입력하면 해당 상세페이지로 이동
            </p>

            <div className="flex gap-2">
              <div className="flex w-full items-center rounded-xl border px-3">
                <span className="mr-2 text-slate-500">MB</span>
                <input
                  className="w-full py-3 outline-none"
                  type="text"
                  inputMode="numeric"
                  placeholder="예: 1159"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchRoom()
                  }}
                />
              </div>

              <button
                onClick={handleSearchRoom}
                className="rounded-xl bg-black px-5 py-3 text-white"
              >
                검색
              </button>
            </div>
          </div>
        </div>

        {loading && <div className="rounded-2xl bg-white p-6 shadow">불러오는 중...</div>}

        {!loading && currentPage === 'list' && (
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">룸 목록</h2>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-slate-100 text-left">
                    <th className="px-4 py-3">Room No.</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">청정도</th>
                    <th className="px-4 py-3">이동</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => (
                    <tr key={room.id} className="border-b">
                      <td className="px-4 py-3">{room.room_no}</td>
                      <td className="px-4 py-3">{room.name}</td>
                      <td className="px-4 py-3">{room.cleanliness}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/room/${room.room_no}`}
                          className="rounded-lg border px-3 py-1 inline-block"
                        >
                          상세보기
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && currentPage === 'detail' && selectedRoom && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="text-xl font-semibold mb-4">상세 페이지</h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border p-4">
                  <p className="text-sm text-slate-500">Room No.</p>
                  <p className="mt-2 text-lg font-semibold">{selectedRoom.room_no}</p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-sm text-slate-500">Name</p>
                  <p className="mt-2 text-lg font-semibold">{selectedRoom.name}</p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-sm text-slate-500">청정도</p>
                  <p className="mt-2 text-lg font-semibold">{selectedRoom.cleanliness}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h3 className="text-lg font-semibold mb-3">고장 이력</h3>

              {breakdownHistories.length === 0 ? (
                <div className="rounded-xl border p-4 text-sm text-slate-500">
                  등록된 고장 이력이 없음
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-slate-100 text-left">
                        <th className="px-4 py-3">날짜</th>
                        <th className="px-4 py-3">간략한 고장 정보</th>
                        <th className="px-4 py-3">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdownHistories.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="px-4 py-3">{item.issue_date}</td>
                          <td className="px-4 py-3">{item.summary}</td>
                          <td className="px-4 py-3">{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h3 className="text-lg font-semibold mb-3">수리 이력</h3>

              {repairHistories.length === 0 ? (
                <div className="rounded-xl border p-4 text-sm text-slate-500">
                  등록된 수리 이력이 없음
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-slate-100 text-left">
                        <th className="px-4 py-3">날짜</th>
                        <th className="px-4 py-3">간략한 조치 정보</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repairHistories.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="px-4 py-3">{item.repair_date}</td>
                          <td className="px-4 py-3">{item.summary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h3 className="text-lg font-semibold mb-3">첨부파일</h3>
              <div className="rounded-xl border p-4 text-sm text-slate-500">
                다음 단계에서 이미지 업로드 및 QR 연동 예정
              </div>
            </div>
          </div>
        )}

        {!loading && currentPage === 'admin' && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="text-xl font-semibold mb-4">관리자 페이지</h2>
              <div className="space-y-2 text-sm">
                <p>총 등록 룸 수: {rooms.length}</p>
                <p>현재 미조치 고장 건 수: {breakdownList.length}</p>
                <p>선택 룸 고장 이력 수: {breakdownHistories.length}</p>
                <p>선택 룸 수리 이력 수: {repairHistories.length}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h3 className="text-lg font-semibold mb-4">고장 접수 등록</h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-600">룸 선택</label>
                  <select
                    className="w-full rounded-xl border px-3 py-3"
                    value={newIssueRoomId}
                    onChange={(e) => setNewIssueRoomId(e.target.value)}
                  >
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.room_no} / {room.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-600">접수일자</label>
                  <input
                    className="w-full rounded-xl border px-3 py-3"
                    type="date"
                    value={newIssueDate}
                    onChange={(e) => setNewIssueDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-600">상태</label>
                  <select
                    className="w-full rounded-xl border px-3 py-3"
                    value={newIssueStatus}
                    onChange={(e) => setNewIssueStatus(e.target.value)}
                  >
                    <option value="접수">접수</option>
                    <option value="진행중">진행중</option>
                    <option value="완료">완료</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm text-slate-600">간략한 고장 정보</label>
                  <input
                    className="w-full rounded-xl border px-3 py-3"
                    type="text"
                    placeholder="예: 도어 클로저 작동 불량"
                    value={newIssueSummary}
                    onChange={(e) => setNewIssueSummary(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleCreateBreakdown}
                  className="rounded-xl bg-black px-5 py-3 text-white"
                >
                  고장 접수 등록
                </button>

                {adminMessage && <p className="text-sm text-slate-600">{adminMessage}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}