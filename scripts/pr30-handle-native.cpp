#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <processsnapshot.h>
#include <map>
#include <string>
#include <iostream>
#include <stdexcept>
using Types = std::map<std::string, unsigned>;
static void check(DWORD code, const char* operation) {
  if (code != ERROR_SUCCESS) throw std::runtime_error(std::string(operation) + " Win32 " + std::to_string(code));
}
static Types types(HANDLE process) {
  HPSS snapshot = nullptr;
  check(PssCaptureSnapshot(process, static_cast<PSS_CAPTURE_FLAGS>(PSS_CAPTURE_HANDLES | PSS_CAPTURE_HANDLE_NAME_INFORMATION), 0, &snapshot), "capture");
  HPSSWALK marker = nullptr;
  try {
    check(PssWalkMarkerCreate(nullptr, &marker), "marker");
    Types result;
    while (true) {
      PSS_HANDLE_ENTRY entry{};
      DWORD code = PssWalkSnapshot(snapshot, PSS_WALK_HANDLES, marker, &entry, sizeof(entry));
      if (code == ERROR_NO_MORE_ITEMS) break;
      check(code, "walk");
      std::string type = "unknown";
      if (entry.TypeName && entry.TypeNameLength) {
        type.clear();
        for (unsigned i = 0; i < entry.TypeNameLength / sizeof(wchar_t); ++i) {
          wchar_t c = entry.TypeName[i];
          type += ((c >= L'A' && c <= L'Z') || (c >= L'a' && c <= L'z')) ? static_cast<char>(c) : '_';
        }
      }
      ++result[type]; // Never inspect or print ObjectName, paths, memory, or handle values.
    }
    check(PssWalkMarkerFree(marker), "marker-free"); marker = nullptr;
    check(PssFreeSnapshot(GetCurrentProcess(), snapshot), "snapshot-free"); snapshot = nullptr;
    return result;
  } catch (...) {
    if (marker) PssWalkMarkerFree(marker);
    if (snapshot) PssFreeSnapshot(GetCurrentProcess(), snapshot);
    throw;
  }
}
static void emit(const Types& values) {
  std::cout << '{'; bool first = true;
  for (auto& pair : values) { if (!first) std::cout << ','; first = false; std::cout << '"' << pair.first << "\":" << pair.second; }
  std::cout << '}';
}
int main(int argc, char** argv) {
  try {
    if (argc == 3 && std::string(argv[1]) == "snapshot") {
      HANDLE process = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ | PROCESS_DUP_HANDLE, FALSE, std::stoul(argv[2]));
      if (!process) check(GetLastError(), "open");
      try { auto observed = types(process); check(CloseHandle(process) ? ERROR_SUCCESS : GetLastError(), "close"); emit(observed); }
      catch (...) { CloseHandle(process); throw; }
      return 0;
    }
    // Independent control: no proc-safe, Node, Job, named pipe, or cryptographic RNG.
    HANDLE self = GetCurrentProcess();
    types(self); types(self); // Warm snapshot infrastructure before measuring CreateProcessW.
    auto before = types(self);
    std::cout << "{\"control\":\"raw-CreateProcessW-missing-executable\",\"before\":"; emit(before);
    std::cout << ",\"attempts\":[";
    for (int i = 0; i < 6; ++i) {
      STARTUPINFOW startup{}; startup.cb = sizeof(startup);
      PROCESS_INFORMATION child{}; wchar_t command[] = L"missing";
      BOOL ok = CreateProcessW(L"C:\\missing.exe", command, nullptr, nullptr, FALSE, CREATE_NO_WINDOW, nullptr, nullptr, &startup, &child);
      DWORD error = ok ? ERROR_SUCCESS : GetLastError();
      if (ok) { CloseHandle(child.hThread); CloseHandle(child.hProcess); throw std::runtime_error("unexpected successful control launch"); }
      if (i) std::cout << ',';
      std::cout << "{\"error\":" << error << ",\"types\":"; emit(types(self)); std::cout << '}';
    }
    std::cout << "]}\n";
    return 0;
  } catch (const std::exception& e) { std::cerr << e.what() << '\n'; return 1; }
}
