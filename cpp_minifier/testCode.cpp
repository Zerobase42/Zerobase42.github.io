#include <iostream>
#include <string>
using namespace std;

#define SQUARE(x) ((x) * (x))  // Macro

// 간단한 클래스
class Box {
    int val;

   public:
    Box(int v) : val(v) {}
    int get() const { return val; }
};

template <typename T>
T add(T a, T b) { return a + b; }  // 템플릿

int main() {
    string msg = "Hello, World!";
    cout << msg << '\n';
    Box b(5);
    cout << b.get() << '\n';
    cout << add(3, 4) << '\n';
    cout << SQUARE(6) << '\n';
    return 0;
}